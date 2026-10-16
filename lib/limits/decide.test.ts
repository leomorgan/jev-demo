// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { NeedDecision } from "@/lib/jev"
import type { JevConfig } from "./config"
import { handleDecide, type DecideDeps, type DecideResponse } from "./decide"
import { deviceSigner } from "./device"
import { costMicros, keysFor, memoryStore, utcDay } from "./limits"

const NOON = Date.UTC(2026, 9, 7, 12, 0, 0)
const SECRET = "x".repeat(64)

const decision = (over: Partial<NeedDecision> = {}): NeedDecision => ({
  need: "lost_card",
  needProbabilities: { lost_card: 1 },
  needConfidence: 1,
  urgency: 2,
  distress: 0.5,
  ms: 300,
  inputTokens: 958,
  costUsd: 0.00004,
  state: { message: "lost my card" },
  ...over,
})

function setup(over: Omit<Partial<DecideDeps>, "config"> & { config?: Partial<JevConfig> } = {}) {
  const deferred: (() => Promise<void>)[] = []
  const lines: Record<string, unknown>[] = []
  const store = memoryStore("development")
  const deps: DecideDeps = {
    limits: store,
    devices: deviceSigner(SECRET),
    isBot: async () => false,
    decide: vi.fn(async () => decision()),
    log: (l) => lines.push(l),
    now: () => NOON,
    defer: (task) => deferred.push(task),
    ...over,
    config: { enabled: true, visitorDailyLimit: 40, dailyBudgetUsd: 2, onVercel: false, ...over.config },
  }
  const flush = async () => {
    for (const t of deferred.splice(0)) await t()
  }
  return { deps, store, lines, flush }
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://jev.test/api/decide", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://jev.test",
      "sec-fetch-site": "same-origin",
      "x-real-ip": "203.0.113.7",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

const read = async (res: Response) => (await res.json()) as DecideResponse

describe("handleDecide: the guards, in order", () => {
  it("refuses requests from other sites without calling Jev", async () => {
    const { deps } = setup()
    const res = await handleDecide(post({ domain: "bank", q: "hi" }, { origin: "https://evil.example", "sec-fetch-site": "cross-site" }), deps)
    expect(res.status).toBe(403)
    expect(deps.decide).not.toHaveBeenCalled()
  })

  it.each([
    ["not JSON", "{"],
    ["an unknown domain", { domain: "shop", q: "hi" }],
    ["an empty message", { domain: "bank", q: "   " }],
    ["a message over 500 characters", { domain: "bank", q: "x".repeat(501) }],
  ])("rejects %s", async (_, body) => {
    const { deps } = setup()
    const res = await handleDecide(post(body), deps)
    expect(res.status).toBe(400)
    expect(deps.decide).not.toHaveBeenCalled()
  })

  it("serves the general page, or the visitor's pick, when the kill switch is on", async () => {
    const { deps } = setup({ config: { enabled: false } })
    expect(await read(await handleDecide(post({ domain: "bank", q: "help" }), deps))).toMatchObject({
      status: "limited",
      reason: "disabled",
      route: { frontEnd: "general" },
    })
    expect(await read(await handleDecide(post({ domain: "bank", q: "help", need: "fraud" }), deps))).toMatchObject({
      route: { frontEnd: "fraud" },
    })
    expect(deps.decide).not.toHaveBeenCalled()
  })

  it("checks BotID on Vercel, and calls nothing for a bot", async () => {
    const { deps } = setup({ config: { onVercel: true }, isBot: async () => true })
    expect(await read(await handleDecide(post({ domain: "bank", q: "help" }), deps))).toMatchObject({ status: "limited", reason: "bot" })
    expect(deps.decide).not.toHaveBeenCalled()
  })

  it("rests on Vercel without a cookie secret, rather than counting quotas by made-up ids", async () => {
    const { deps } = setup({ devices: null })
    expect(await read(await handleDecide(post({ domain: "bank", q: "help" }), deps))).toMatchObject({ reason: "disabled" })
    expect(deps.decide).not.toHaveBeenCalled()
  })

  it("fails closed when the quota store is missing or down", async () => {
    const { deps } = setup({ limits: null })
    expect(await read(await handleDecide(post({ domain: "bank", q: "help" }), deps))).toMatchObject({ reason: "unavailable" })
    expect(deps.decide).not.toHaveBeenCalled()
  })
})

describe("handleDecide: a decision", () => {
  it("returns Jev's decision and route, gives a new device a signed cookie, and settles at what it cost", async () => {
    const { deps, store, lines, flush } = setup()
    const res = await handleDecide(post({ domain: "bank", q: "Left my card in a cash machine" }), deps)
    expect(await read(res)).toMatchObject({ status: "ok", route: { frontEnd: "card", urgent: true } })
    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toMatch(/^jev_device=[0-9a-f-]{36}\.[0-9a-f]{64}; Path=\/api\/decide; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure$/)
    await flush()
    const k = keysFor("development", { day: utcDay(NOON), visitor: "", network: "" })
    expect(store.counts.get(k.spend)).toBe(Math.round(costMicros(958)))
    expect(store.counts.get(k.held)).toBe(0)
    // one usage line, never the visitor's words
    const line = lines.find((l) => l.outcome === "ok")
    expect(line).toMatchObject({ event: "jev_decision", domain: "bank", frontEnd: "card", input_tokens: 958 })
    expect(JSON.stringify(lines)).not.toContain("cash machine")
  })

  it("keeps counting the same device when it sends its cookie back, and stops at the daily limit", async () => {
    const { deps, flush } = setup({ config: { visitorDailyLimit: 2 } })
    const first = await handleDecide(post({ domain: "bank", q: "one" }), deps)
    const cookie = (first.headers.get("set-cookie") ?? "").split(";")[0]
    await flush()
    expect(await read(await handleDecide(post({ domain: "bank", q: "two" }, { cookie }), deps))).toMatchObject({ status: "ok" })
    await flush()
    expect(await read(await handleDecide(post({ domain: "bank", q: "three" }, { cookie }), deps))).toMatchObject({
      status: "limited",
      reason: "quota",
      route: { frontEnd: "general" },
    })
    expect(deps.decide).toHaveBeenCalledTimes(2)
  })

  it("gives the decision back when the provider turned the call down (unbilled)", async () => {
    const turnedDown = Object.assign(new Error("Free tier users do not have access"), { statusCode: 403 })
    const { deps, store, flush } = setup({ decide: vi.fn(async () => Promise.reject(turnedDown)) })
    const res = await handleDecide(post({ domain: "energy", q: "no power" }), deps)
    expect(await read(res)).toMatchObject({ status: "limited", reason: "unavailable", route: { frontEnd: "general" } })
    await flush()
    const k = keysFor("development", { day: utcDay(NOON), visitor: "", network: "" })
    expect(store.counts.get(k.spend) ?? 0).toBe(0)
    expect([...store.counts].filter(([key, n]) => key.includes(":asks:") && n > 0)).toEqual([])
  })

  it("keeps the worst case charged when the call may have been billed (a timeout)", async () => {
    const { deps, store, flush } = setup({ decide: vi.fn(async () => Promise.reject(new Error("aborted"))) })
    await handleDecide(post({ domain: "energy", q: "no power" }), deps)
    await flush()
    const k = keysFor("development", { day: utcDay(NOON), visitor: "", network: "" })
    expect(store.counts.get(k.spend)).toBeGreaterThan(Math.round(costMicros(958)))
  })
})
