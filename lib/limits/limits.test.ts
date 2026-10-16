// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

import { configFromEnv } from "@/lib/limits/config"
import {
  capsFrom,
  checkBudget,
  clientIp,
  ATTEMPTS_PER_DECISION,
  costMicros,
  environmentFrom,
  keysFor,
  limitStoreFromEnv,
  memoryStore,
  networkKey,
  networkOf,
  secondsToTomorrow,
  upstashStore,
  utcDay,
  visitorKey,
  worstCaseMicros,
  FIXED_PROMPT_TOKENS,
  JEV_MICROS_PER_TOKEN,
  type LimitStore,
  type Payer,
} from "@/lib/limits/limits"

// The public spend caps and their tests: read from the environment,
// failing closed. Only the switches' defaults and the pricing are Jev's own.

const NOON = Date.UTC(2026, 9, 7, 12, 0, 0)

describe("the switches", () => {
  it("is on, at 40 decisions and $2 a day, unless told otherwise", () => {
    expect(configFromEnv({})).toEqual({ enabled: true, visitorDailyLimit: 40, dailyBudgetUsd: 2, onVercel: false })
  })

  it.each(["false", "0", "off", "OFF", " no "])("JEV_ENABLED=%s switches it off", (v) => {
    expect(configFromEnv({ JEV_ENABLED: v }).enabled).toBe(false)
  })

  it("reads the caps, and ignores nonsense", () => {
    const c = configFromEnv({ JEV_VISITOR_DAILY_LIMIT: "30", JEV_DAILY_BUDGET_USD: "5.5", VERCEL: "1" })
    expect(c).toMatchObject({ visitorDailyLimit: 30, dailyBudgetUsd: 5.5, onVercel: true })
    expect(configFromEnv({ JEV_VISITOR_DAILY_LIMIT: "lots", JEV_DAILY_BUDGET_USD: "-1" })).toMatchObject({
      visitorDailyLimit: 40,
      dailyBudgetUsd: 2,
    })
  })
})

describe("what a decision costs", () => {
  it("prices Jev at $0.042 per million input tokens, output free", () => {
    expect(JEV_MICROS_PER_TOKEN).toBe(0.042)
    expect(costMicros(950)).toBeCloseTo(39.9)
    expect(costMicros(1_000_000)).toBeCloseTo(42_000)
  })

  it("charges a decision's worst case up front: two attempts, the fixed questions plus a token per byte", () => {
    expect(ATTEMPTS_PER_DECISION).toBe(2)
    expect(worstCaseMicros(500)).toBeCloseTo(2 * (FIXED_PROMPT_TOKENS + 500) * 0.042)
    // the longest message (500 characters, up to 4 bytes each) still fits a visitor's share many times over
    const worst = worstCaseMicros(2000)
    expect(worst).toBeLessThan(capsFrom({ visitorDailyLimit: 40, dailyBudgetUsd: 2 }).visitorMicros / 1000)
  })

  it("reserves more than twice what a real decision costs (970 tokens measured for a 70-character message)", () => {
    expect(worstCaseMicros(70) / costMicros(970)).toBeGreaterThan(2)
  })
})

describe("checkBudget: an ask is charged its worst case up front, in one atomic step", () => {
  // the caps at $2 a day and 3 asks a visitor: a visitor may spend $0.50, a network $0.67
  const caps = capsFrom({ visitorDailyLimit: 3, dailyBudgetUsd: 2 })
  const payer = { day: utcDay(NOON), visitor: "v1", network: "n1" }
  const ask = (store: LimitStore | null, p: Payer = payer, micros = 10_000) => checkBudget({ store, payer: p, micros, caps })
  /** A reply over: its up-front charge corrected to what it cost. */
  const settle = (store: LimitStore, p: Payer, charged: number, spent: number) =>
    store.settle(p, { chargedMicros: charged, spentMicros: spent })

  it("gives no visitor more than a quarter of the day's budget, or a network more than a third", () => {
    expect(caps).toEqual({ visitorAsks: 3, networkDevices: 30, budgetMicros: 2_000_000, visitorMicros: 500_000, networkMicros: 666_667 })
  })

  it("counts asks per visitor per day", async () => {
    const store = memoryStore()
    for (let i = 1; i <= 3; i++) expect(await ask(store)).toEqual({ ok: true, asks: i })
    expect(await ask(store)).toEqual({ ok: false, code: "quota" })
    expect(await ask(store, { ...payer, visitor: "v2" })).toEqual({ ok: true, asks: 1 })
    expect(await ask(store, { ...payer, day: utcDay(NOON + 24 * 60 * 60 * 1000) })).toEqual({ ok: true, asks: 1 })
  })

  it("caps the devices a network brings in a day, so dropping or making up the device cookie doesn't start the count over", async () => {
    const store = memoryStore()
    // a fresh device id on every ask (no cookie, or a made-up one): each is a new visitor, on the same network
    for (let i = 0; i < 30; i++) expect((await ask(store, { ...payer, visitor: `fresh-${i}` })).ok).toBe(true)
    expect(await ask(store, { ...payer, visitor: "fresh-30" })).toEqual({ ok: false, code: "network" })
    // the people already on it keep asking under their own quotas, and other networks aren't touched
    expect((await ask(store, { ...payer, visitor: "fresh-3" })).ok).toBe(true)
    expect((await ask(store, { ...payer, visitor: "elsewhere", network: "n2" })).ok).toBe(true)
  })

  it("lets a room full of people on one network jam: each device counts once a day, on its first ask", async () => {
    const store = memoryStore()
    // ten people at a meetup on one Wi-Fi, three asks each, each reply about half a cent
    for (let person = 0; person < 10; person++) {
      for (let i = 0; i < 3; i++) {
        const p = { ...payer, visitor: `person-${person}` }
        expect((await ask(store, p, 50_000)).ok, `person ${person}, ask ${i + 1}`).toBe(true)
        await settle(store, p, 50_000, 5_000)
      }
    }
    expect(store.counts.get(keysFor("development", payer).networkDevices)).toBe(10)
    // a newcomer's first ask still goes through
    expect((await ask(store, { ...payer, visitor: "newcomer" })).ok).toBe(true)
  })

  it("caps what one visitor, and one network, really spend: no one can rest decisions for everyone", async () => {
    const store = memoryStore()
    const k = keysFor("development", payer)
    // heavy replies, each settling at its whole worst case
    expect((await ask(store, payer, 300_000)).ok).toBe(true)
    await settle(store, payer, 300_000, 300_000)
    // $0.30 spent: another $0.30 worst case would carry them past their $0.50 share, so it's the day's limit
    expect(await ask(store, payer, 300_000)).toEqual({ ok: false, code: "quota" })
    // a smaller one still fits what's left
    expect((await ask(store, payer, 150_000)).ok).toBe(true)
    await settle(store, payer, 150_000, 150_000)
    // the network has spent $0.45 of its $0.67: a newcomer's $0.30 worst case doesn't fit, a $0.20 one does
    const v2 = { ...payer, visitor: "v2" }
    expect(await ask(store, v2, 300_000)).toEqual({ ok: false, code: "network" })
    expect((await ask(store, v2, 200_000)).ok).toBe(true)
    await settle(store, v2, 200_000, 200_000)
    expect(await ask(store, { ...payer, visitor: "v3" }, 20_000)).toEqual({ ok: false, code: "network" })
    // neither went past its share, even with every reply at its worst
    expect(store.counts.get(k.visitorSpend)).toBeLessThanOrEqual(caps.visitorMicros)
    expect(store.counts.get(k.networkSpend)).toBeLessThanOrEqual(caps.networkMicros)
    // the day's budget is still there for everyone else
    expect((await ask(store, { ...payer, visitor: "v9", network: "n9" }, 300_000)).ok).toBe(true)
  })

  it("never lets one ask carry a visitor or a network past its share, not even the day's first", async () => {
    const store = memoryStore()
    // a worst case bigger than a whole visitor's share ($0.50) can't get through on an empty day
    expect(await ask(store, payer, caps.visitorMicros + 1)).toEqual({ ok: false, code: "quota" })
    // nothing was counted for it
    expect(store.counts.size).toBe(0)
    // exactly the share fits
    expect(await ask(store, payer, caps.visitorMicros)).toEqual({ ok: true, asks: 1 })
    // a network's share the same way: two visitors whose worst cases together pass $0.67
    const n2 = (visitor: string) => ({ ...payer, visitor, network: "n2" })
    expect((await ask(store, n2("a"), 400_000)).ok).toBe(true)
    await settle(store, n2("a"), 400_000, 400_000)
    expect(await ask(store, n2("b"), 300_000)).toEqual({ ok: false, code: "network" })
    expect((await ask(store, n2("b"), 266_667)).ok).toBe(true)
  })

  it("over a whole day of asks settling at their worst, keeps every visitor and network inside its share", async () => {
    const store = memoryStore()
    const big = capsFrom({ visitorDailyLimit: 1000, dailyBudgetUsd: 2 })
    // three visitors on one network take turns until they're all turned away for the day
    const people = ["a", "b", "c"].map((visitor) => ({ ...payer, visitor }))
    let refusals = 0
    for (let round = 0; refusals < people.length && round < 100; round++) {
      refusals = 0
      for (const p of people) {
        const charge = 30_000 + ((round * 7_919) % 50_000)
        const a = await checkBudget({ store, payer: p, micros: charge, caps: big })
        if (a.ok) await settle(store, p, charge, charge)
        else refusals++
      }
    }
    expect(refusals).toBe(people.length)
    for (const p of people) expect(store.counts.get(keysFor("development", p).visitorSpend) ?? 0).toBeLessThanOrEqual(big.visitorMicros)
    expect(store.counts.get(keysFor("development", payer).networkSpend)).toBeLessThanOrEqual(big.networkMicros)
  })

  it("holds asks still in flight against the shares, so a burst can't run past one, and says it's only for a moment", async () => {
    const store = memoryStore()
    // one visitor, $0.20 worst cases fired at once: their $0.50 share holds two
    expect((await ask(store, payer, 200_000)).ok).toBe(true)
    expect((await ask(store, payer, 200_000)).ok).toBe(true)
    // nothing is spent yet: the room is full for now, not the day's asks used up
    expect(await ask(store, payer, 200_000)).toEqual({ ok: false, code: "busy", full: "visitor" })
    // once they settle at what they really cost, the share is free again
    await settle(store, payer, 200_000, 6_000)
    await settle(store, payer, 200_000, 6_000)
    expect((await ask(store, payer, 200_000)).ok).toBe(true)
    // the same on a network: three visitors with no cookie, $0.30 each against its $0.67
    const fresh = (visitor: string) => ({ ...payer, visitor, network: "n2" })
    expect((await ask(store, fresh("a"), 300_000)).ok).toBe(true)
    expect((await ask(store, fresh("b"), 300_000)).ok).toBe(true)
    expect(await ask(store, fresh("c"), 300_000)).toEqual({ ok: false, code: "busy", full: "network" })
  })

  it("never closes a network for the day over a burst: a meetup's first asks all at once wait a moment, while its real spend is near nothing", async () => {
    // twelve people on one Wi-Fi ask at once, each body about 3 KB (a worst case of about $0.072 each)
    const store = memoryStore()
    const charge = 71_980
    const people = Array.from({ length: 12 }, (_, i) => ({ ...payer, visitor: `person-${i}`, network: "meetup" }))
    const first = await Promise.all(people.map((p) => ask(store, p, charge)))
    expect(first.filter((a) => a.ok)).toHaveLength(9)
    // the other three are told to wait a moment, never "back tomorrow": nothing is spent yet
    expect(first.filter((a) => !a.ok)).toEqual(Array.from({ length: 3 }, () => ({ ok: false, code: "busy", full: "network" })))
    // the nine replies settle at a few cents between them, and the three get through
    for (const [i, a] of first.entries()) if (a.ok) await settle(store, people[i], charge, 4_000)
    for (const [i, a] of first.entries()) if (!a.ok) expect((await ask(store, people[i], charge)).ok, `person ${i}`).toBe(true)
  })

  it("never lets asks fired all at once past the budget: each is held before the next is checked", async () => {
    const store = memoryStore()
    const many = Array.from({ length: 40 }, (_, i) => ask(store, { ...payer, visitor: `v${i}`, network: `n${i}` }, 300_000))
    const answers = await Promise.all(many)
    // $2 holds six worst cases of $0.30, not seven
    expect(answers.filter((a) => a.ok)).toHaveLength(6)
    // the rest find the room full for a moment; nothing has been spent, so no one is told "resting"
    expect(answers.filter((a) => !a.ok).every((a) => !a.ok && a.code === "busy" && a.full === "budget")).toBe(true)
    expect(store.counts.get(`jev:development:held:${payer.day}`)).toBe(1_800_000)
    expect(store.counts.get(`jev:development:spend:${payer.day}`) ?? 0).toBe(0)
  })

  it("rests everyone once what's really been spent leaves no room for the next ask's worst case", async () => {
    const store = memoryStore()
    await store.settle({ ...payer, visitor: "v0", network: "n0" }, { chargedMicros: 0, spentMicros: 1_990_000 })
    const v2 = { ...payer, visitor: "v2", network: "n2" }
    expect((await ask(store, v2, 10_000)).ok).toBe(true)
    // that one's still in flight: a moment's wait
    expect(await ask(store, { ...payer, visitor: "v3", network: "n3" }, 1)).toEqual({ ok: false, code: "busy", full: "budget" })
    // it settles at its whole worst case: the day's budget is spent, and everyone rests until tomorrow
    await settle(store, v2, 10_000, 10_000)
    expect(await ask(store, { ...payer, visitor: "v3", network: "n3" }, 1)).toEqual({ ok: false, code: "resting" })
  })

  it("releases the hold and counts what the reply really cost against the day, the visitor and the network", async () => {
    const store = memoryStore()
    await ask(store, payer, 300_000)
    await settle(store, payer, 300_000, 12_000)
    expect(store.counts.get(`jev:development:held:${payer.day}`)).toBe(0)
    expect(store.counts.get(`jev:development:spend:${payer.day}`)).toBe(12_000)
    expect(store.counts.get(`jev:development:visitor-spend:${payer.day}:v1`)).toBe(12_000)
    expect(store.counts.get(`jev:development:net-spend:${payer.day}:n1`)).toBe(12_000)
  })

  it("gives an ask back when the API turned its call down: the visitor's count, and a first ask's device on the network", async () => {
    const store = memoryStore()
    const k = keysFor("development", payer)
    // a first ask of the day, turned down before it started: nothing counted
    expect(await ask(store)).toEqual({ ok: true, asks: 1 })
    await store.settle(payer, { chargedMicros: 10_000, spentMicros: 0, returnAsk: true })
    expect(store.counts.get(k.visitorAsks)).toBe(0)
    expect(store.counts.get(k.networkDevices)).toBe(0)
    expect(store.counts.get(k.held)).toBe(0)
    // so the day's three asks are all still there, and the device counts once, when it really asks
    for (let i = 1; i <= 3; i++) {
      expect(await ask(store)).toEqual({ ok: true, asks: i })
      await settle(store, payer, 10_000, 1_000)
    }
    expect(store.counts.get(k.networkDevices)).toBe(1)
    // a later ask given back leaves the device counted: it has asked today
    await store.settle(payer, { chargedMicros: 0, spentMicros: 0, returnAsk: true })
    expect(store.counts.get(k.visitorAsks)).toBe(2)
    expect(store.counts.get(k.networkDevices)).toBe(1)
  })

  it("fails closed with no store, or one that throws", async () => {
    // an outage, told apart from a spent budget so the route can answer it as one (a 503)
    expect(await ask(null)).toEqual({ ok: false, code: "resting", unavailable: true })
    const broken: LimitStore = {
      environment: "development",
      admit: vi.fn(async () => Promise.reject(new Error("timeout"))),
      settle: async () => {},
    }
    expect(await ask(broken)).toEqual({ ok: false, code: "resting", unavailable: true })
  })
})

describe("the stores", () => {
  it("needs Redis on Vercel, and uses memory only on a developer's machine", () => {
    expect(limitStoreFromEnv({ VERCEL: "1" })).toBeNull()
    expect(limitStoreFromEnv({})).not.toBeNull()
    expect(limitStoreFromEnv({ VERCEL: "1", KV_REST_API_URL: "https://redis.test", KV_REST_API_TOKEN: "test-token" })).not.toBeNull()
  })

  it("reads only the Upstash credentials (KV_REST_API_URL and KV_REST_API_TOKEN)", () => {
    expect(limitStoreFromEnv({ VERCEL: "1", UPSTASH_REDIS_REST_URL: "https://redis.test", UPSTASH_REDIS_REST_TOKEN: "test-token" })).toBeNull()
    expect(limitStoreFromEnv({ VERCEL: "1", KV_REST_API_URL: "https://redis.test" })).toBeNull()
  })

  it("admits in one Redis script (atomic), and settles the three spend totals together", async () => {
    const calls: unknown[][] = []
    const piped: string[] = []
    const fake = {
      eval: async (script: string, keys: string[], args: unknown[]) => {
        calls.push([script, keys, args])
        return ["ok", 4]
      },
      pipeline: () => {
        const p = {
          incrby: (k: string, n: number) => (piped.push(`incrby ${k} ${n}`), p),
          expire: (k: string, n: number) => (piped.push(`expire ${k} ${n}`), p),
          exec: async () => [],
        }
        return p
      },
    }
    const store = upstashStore(fake as never, "production")
    const caps = capsFrom({ visitorDailyLimit: 15, dailyBudgetUsd: 2 })
    const p = { day: "2026-10-07", visitor: "abc", network: "f00d1" }
    expect(await store.admit(p, 12.3, caps)).toEqual({ ok: true, asks: 4 })
    const [script, keys, args] = calls[0] as [string, string[], unknown[]]
    expect(keys).toEqual([
      "jev:production:spend:2026-10-07",
      "jev:production:asks:2026-10-07:abc",
      "jev:production:net-devices:2026-10-07:f00d1",
      "jev:production:visitor-spend:2026-10-07:abc",
      "jev:production:net-spend:2026-10-07:f00d1",
      "jev:production:visitor-held:2026-10-07:abc",
      "jev:production:net-held:2026-10-07:f00d1",
      "jev:production:held:2026-10-07",
    ])
    // charge, budget, visitor asks and share, network devices and share, kept for: nothing from the
    // browser says whether the device is new
    expect(args).toEqual([13, 2_000_000, 15, 500_000, 30, 666_667, 172800])
    // the script decides that from its own counts: a visitor with no asks yet today is a device new today
    expect(script).toContain("local asks = num(KEYS[2])")
    expect(script).toContain("local fresh = asks == 0")
    expect(script).toContain("if fresh then redis.call('INCR', KEYS[3]) end")
    // checks first, then counts: a refused ask changes nothing
    for (const refusal of ["return {'resting'", "return {'quota'", "return {'network'", "return {'busy'"]) {
      expect(script.indexOf(refusal)).toBeGreaterThan(0)
      expect(script.indexOf(refusal)).toBeLessThan(script.indexOf("INCRBY"))
    }
    // the day's limits come from what's been spent, before a full room of asks in flight is checked
    expect(script.indexOf("return {'network'")).toBeLessThan(script.indexOf("return {'busy'"))
    // the shares are strict: this ask's worst case has to fit what's left of each, as with the budget
    expect(script).toContain("visitorSpent + charge > visitorShare then return {'quota'")
    expect(script).toContain("networkSpent + charge > networkShare then return {'network'")
    expect(script).not.toMatch(/Spent >= /)
    // what was spent only grows when a reply settles: up front, the charge is held
    expect(script).not.toMatch(/INCRBY', KEYS\[[145]\]/)
    expect(script).toContain("redis.call('INCRBY', KEYS[8], charge)")
    expect(script).toContain("EXPIRE")

    await store.settle(p, { chargedMicros: 12_300.2, spentMicros: 3_299.6 })
    expect(piped).toEqual([
      "incrby jev:production:held:2026-10-07 -12301",
      "incrby jev:production:spend:2026-10-07 3300",
      "expire jev:production:spend:2026-10-07 172800",
      "incrby jev:production:visitor-held:2026-10-07:abc -12301",
      "incrby jev:production:net-held:2026-10-07:f00d1 -12301",
      "incrby jev:production:visitor-spend:2026-10-07:abc 3300",
      "expire jev:production:visitor-spend:2026-10-07:abc 172800",
      "incrby jev:production:net-spend:2026-10-07:f00d1 3300",
      "expire jev:production:net-spend:2026-10-07:f00d1 172800",
    ])
    // a settled reply keeps its ask: no other script ran
    expect(calls).toHaveLength(1)

    // an ask given back: one more script (atomic), on the visitor's asks and the network's devices
    await store.settle(p, { chargedMicros: 100, spentMicros: 0, returnAsk: true })
    expect(calls).toHaveLength(2)
    const [returnScript, returnKeys] = calls[1] as [string, string[], unknown[]]
    expect(returnKeys).toEqual(["jev:production:asks:2026-10-07:abc", "jev:production:net-devices:2026-10-07:f00d1"])
    // never below zero, and the device only when that was the visitor's one ask today
    expect(returnScript).toContain("if asks <= 0 then return 0 end")
    expect(returnScript).toContain("redis.call('DECR', KEYS[1])")
    expect(returnScript).toContain("if asks == 0 and")
  })

  it("reads a refusal back from the script, and treats anything else as the store being down", async () => {
    const answer = (raw: unknown) => upstashStore({ eval: async () => raw, pipeline: () => ({}) } as never, "production")
    const caps = capsFrom({ visitorDailyLimit: 15, dailyBudgetUsd: 2 })
    const p = { day: "2026-10-07", visitor: "abc", network: "f00d1" }
    expect(await answer(["quota", 15]).admit(p, 1, caps)).toEqual({ ok: false, code: "quota" })
    expect(await answer(["network", 3]).admit(p, 1, caps)).toEqual({ ok: false, code: "network" })
    expect(await answer(["resting", 0]).admit(p, 1, caps)).toEqual({ ok: false, code: "resting" })
    expect(await answer(["busy", 3, "network"]).admit(p, 1, caps)).toEqual({ ok: false, code: "busy", full: "network" })
    await expect(answer(["busy", 3, "everything"]).admit(p, 1, caps)).rejects.toThrow()
    await expect(answer("OK").admit(p, 1, caps)).rejects.toThrow()
  })
})

describe("environments: local, e2e and judge runs never count against production", () => {
  it("counts in the environment Vercel names, and in development anywhere else", () => {
    expect(environmentFrom({ VERCEL_ENV: "production" })).toBe("production")
    expect(environmentFrom({ VERCEL_ENV: "preview" })).toBe("preview")
    expect(environmentFrom({ VERCEL_ENV: "development" })).toBe("development")
    // a developer's machine (and `vercel env pull` without it), or anything unexpected
    expect(environmentFrom({})).toBe("development")
    expect(environmentFrom({ VERCEL_ENV: "" })).toBe("development")
    expect(environmentFrom({ VERCEL_ENV: "staging" })).toBe("development")
    expect(environmentFrom({ VERCEL_ENV: " Production " })).toBe("production")
  })

  it("starts every key with its environment, so no two environments share a count", () => {
    const payer = { day: "2026-10-07", visitor: "abc", network: "f00d1" }
    const all = ["production", "preview", "development"] as const
    const keys = all.map((env) => Object.values(keysFor(env, payer)))
    all.forEach((env, i) => keys[i].forEach((k) => expect(k.startsWith(`jev:${env}:`)).toBe(true)))
    expect(new Set(keys.flat()).size).toBe(keys.flat().length)
  })

  it("builds the deployment's store in its own environment", () => {
    const creds = { KV_REST_API_URL: "https://redis.test", KV_REST_API_TOKEN: "test-token" }
    expect(limitStoreFromEnv({ VERCEL: "1", VERCEL_ENV: "production", ...creds })?.environment).toBe("production")
    expect(limitStoreFromEnv({ VERCEL: "1", VERCEL_ENV: "preview", ...creds })?.environment).toBe("preview")
    // a developer's machine with production's Redis pulled into .env.local
    expect(limitStoreFromEnv(creds)?.environment).toBe("development")
    expect(limitStoreFromEnv({})?.environment).toBe("development")
  })

  it("leaves production's quota and budget untouched by a development run on the same Redis", async () => {
    // one shared Redis, as `vercel env pull` gives a developer's machine
    const db = new Map<string, number>()
    const redis = {
      eval: async (_script: string, keys: string[], args: number[]) => {
        const [charge, budget, visitorAsks] = args
        const num = (k: string) => db.get(k) ?? 0
        if (num(keys[0]) + charge > budget) return ["resting", 0]
        if (num(keys[1]) + 1 > visitorAsks) return ["quota", num(keys[1])]
        db.set(keys[0], num(keys[0]) + charge)
        db.set(keys[1], num(keys[1]) + 1)
        return ["ok", num(keys[1])]
      },
      pipeline: () => ({}),
    }
    const caps = capsFrom({ visitorDailyLimit: 2, dailyBudgetUsd: 2 })
    const payer = { day: "2026-10-07", visitor: "same-visitor", network: "f00d1", newDevice: false }
    const dev = upstashStore(redis as never, "development")
    const prod = upstashStore(redis as never, "production")
    // a judge run spends the whole day's development budget and this visitor's asks there
    expect(await dev.admit(payer, 1_000_000, caps)).toEqual({ ok: true, asks: 1 })
    expect(await dev.admit(payer, 1_000_000, caps)).toEqual({ ok: true, asks: 2 })
    expect(await dev.admit(payer, 1, caps)).toEqual({ ok: false, code: "resting" })
    // production hasn't been touched: the same visitor still has their asks, and the budget is whole
    expect(await prod.admit(payer, 1_000_000, caps)).toEqual({ ok: true, asks: 1 })
    expect(db.get("jev:production:spend:2026-10-07")).toBe(1_000_000)
    expect(db.get("jev:development:spend:2026-10-07")).toBe(2_000_000)
  })

  it("keeps a developer's in-memory counts apart from production's too", async () => {
    const dev = memoryStore()
    const caps = capsFrom({ visitorDailyLimit: 15, dailyBudgetUsd: 2 })
    await dev.admit({ day: "2026-10-07", visitor: "v", network: "n" }, 10, caps)
    expect([...dev.counts.keys()].every((k) => k.startsWith("jev:development:"))).toBe(true)
  })
})

describe("who's asking", () => {
  it("takes the platform's client IP", () => {
    expect(clientIp(new Request("https://x.test", { headers: { "x-real-ip": "198.51.100.2" } }))).toBe("198.51.100.2")
    expect(clientIp(new Request("https://x.test", { headers: { "x-forwarded-for": "198.51.100.3, 10.0.0.1" } }))).toBe("198.51.100.3")
  })

  it("keys the quota by a hash, so neither the IP nor the device is kept", async () => {
    const a = await visitorKey("198.51.100.2", "0b2f5c1e-4a7d-4c3e-9f10-123456789abc")
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toContain("198")
    expect(await visitorKey("198.51.100.3", "0b2f5c1e-4a7d-4c3e-9f10-123456789abc")).not.toBe(a)
    expect(await visitorKey("198.51.100.2", "1b2f5c1e-4a7d-4c3e-9f10-123456789abc")).not.toBe(a)
    expect(await visitorKey("198.51.100.2", "0b2f5c1e-4a7d-4c3e-9f10-123456789abc")).toBe(a)
  })

  it("counts an IPv6 visitor by its /48, so the holder of a routed block is one network, not thousands", () => {
    expect(networkOf("2001:db8:85a3:12::8a2e:370:7334")).toBe("2001:db8:85a3::/48")
    expect(networkOf("2001:db8:85a3:12:ffff:1:2:3")).toBe("2001:db8:85a3::/48")
    // every /64 in the /48 is the same network
    expect(networkOf("2001:db8:85a3:ffff::1")).toBe("2001:db8:85a3::/48")
    expect(networkOf("2001:DB8:85A3:0042:0:0:0:1")).toBe("2001:db8:85a3::/48")
    // the next /48 over is another
    expect(networkOf("2001:db8:85a4:12::1")).toBe("2001:db8:85a4::/48")
    expect(networkOf("2001:0db8::1")).toBe("2001:db8:0::/48")
    expect(networkOf("2001:db8::198.51.100.2")).toBe("2001:db8:0::/48")
    // IPv4, and IPv4 written as IPv6, by address
    expect(networkOf("::ffff:198.51.100.2")).toBe("198.51.100.2")
    expect(networkOf("198.51.100.2")).toBe("198.51.100.2")
  })

  it("keys a network by a coarse bucket, too coarse to tell which address it was", async () => {
    const a = await networkKey("198.51.100.2")
    expect(a).toMatch(/^[0-9a-f]{5}$/)
    expect(await networkKey("198.51.100.2")).toBe(a)
    expect(await networkKey("2001:db8:85a3:12::1")).toBe(await networkKey("2001:db8:85a3:12:9:9:9:9"))
    expect(await networkKey("2001:db8:85a3:12::1")).toBe(await networkKey("2001:db8:85a3:beef::1"))
  })

  it("brings one /48's many /64s in as one network's devices: a routed block can't pose as hundreds of networks", async () => {
    const store = memoryStore()
    const caps = capsFrom({ visitorDailyLimit: 15, dailyBudgetUsd: 2 })
    const payer = async (i: number) => {
      // a fresh /64 (and a fresh device) on every ask, all inside 2001:db8:85a3::/48
      const ip = `2001:db8:85a3:${i.toString(16)}::1`
      return { day: "2026-10-07", visitor: await visitorKey(ip, crypto.randomUUID()), network: await networkKey(ip) }
    }
    for (let i = 0; i < 30; i++) expect((await checkBudget({ store, payer: await payer(i), micros: 10_000, caps })).ok, `ask ${i + 1}`).toBe(true)
    expect(await checkBudget({ store, payer: await payer(30), micros: 10_000, caps })).toEqual({ ok: false, code: "network" })
  })
})

describe("the day", () => {
  it("counts down to the next UTC midnight", () => {
    expect(secondsToTomorrow(NOON)).toBe(12 * 60 * 60)
    expect(utcDay(NOON)).toBe("2026-10-07")
  })
})
