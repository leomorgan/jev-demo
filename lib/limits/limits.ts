// The public spend caps behind one seam, `checkBudget`: the admission rules, Redis scripts and
// stores, at Jev's prices.
//
// Every decision is held up front, before the Jev call, at what it could cost at most, in one atomic
// step with the checks: so decisions fired all at once can't slip past a cap together. When the call
// is over, the hold is released and what it really cost is added to what's been spent.
// Two kinds of "no", kept apart:
// - The day's limits, from what has really been spent (settled): the day's budget, a visitor's
//   decisions or their share of the budget, a network's share of devices or of the budget. These hold
//   until the next UTC midnight.
// - A full room, from decisions still in flight: their worst cases fill a cap for a moment, and are
//   released as they settle. That's "busy", never the rest of the day.
// A device counts against its network on its first decision of the day, whatever its cookie says, so
// dropping the device cookie (`device.ts`) doesn't start a visitor's count over for free.
// The shares are strict: no visitor spends more than a quarter of the day's budget, nor a network more
// than a third, so no single visitor or network can rest decisions for everyone.
// Every key carries its environment (production, preview or development), so a developer's machine,
// which shares production's Redis through `vercel env pull`, never counts against production.

import { Redis } from "@upstash/redis"

import type { JevConfig } from "./config"

type Env = Record<string, string | undefined>

/** The environments the counts are kept apart by: Vercel's `VERCEL_ENV`. */
export const ENVIRONMENTS = ["production", "preview", "development"] as const
export type Environment = (typeof ENVIRONMENTS)[number]

/**
 * The environment this server counts in. `VERCEL_ENV` on Vercel; anything else, including a
 * developer's machine with no `VERCEL_ENV` at all, is development, so only a real production
 * deployment ever touches production's counts.
 */
export function environmentFrom(env: Env): Environment {
  const named = (env.VERCEL_ENV ?? "").trim().toLowerCase()
  return ENVIRONMENTS.find((e) => e === named) ?? "development"
}

/** Today's caps, in asks, devices and millionths of a dollar. */
export type Caps = {
  /** Asks per visitor (an IP and a device) per day. */
  visitorAsks: number
  /**
   * Devices per network (an IP bucket) per day, each counted on its first ask of the day (a visitor
   * key the store hasn't seen today): dropping or forging the device cookie to get a fresh quota
   * runs into this. Everyone who shares a network (a household, an office, a meetup) can each ask,
   * under their own quota.
   */
  networkDevices: number
  /** The day's whole budget. */
  budgetMicros: number
  /** One visitor's share of it: what their replies really cost, plus the worst cases still in flight. */
  visitorMicros: number
  /** One network's share of it, counted the same way. */
  networkMicros: number
}

/** Devices a network can bring in a day: a meetup room's worth. */
export const NETWORK_NEW_DEVICES = 30
/** One visitor may spend a quarter of the day's budget: no one can rest decisions for everyone. */
export const VISITOR_BUDGET_SHARE = 0.25
/** One network may spend a third of it: resting decisions takes several networks, not one. */
export const NETWORK_BUDGET_SHARE = 1 / 3

export function capsFrom(config: Pick<JevConfig, "visitorDailyLimit" | "dailyBudgetUsd">): Caps {
  const budgetMicros = Math.round(config.dailyBudgetUsd * 1_000_000)
  return {
    visitorAsks: config.visitorDailyLimit,
    networkDevices: NETWORK_NEW_DEVICES,
    budgetMicros,
    visitorMicros: Math.round(budgetMicros * VISITOR_BUDGET_SHARE),
    networkMicros: Math.round(budgetMicros * NETWORK_BUDGET_SHARE),
  }
}

/** Who an ask is charged to, and on which UTC day. */
export type Payer = { day: string; visitor: string; network: string }

/** The day's limits: what's really been spent (or asked, or brought in) today says no until midnight. */
export type DayLimit = "quota" | "network" | "resting"

/** Which cap the asks still in flight are filling for now. */
export type FullCap = "budget" | "visitor" | "network"

/**
 * `quota`: this visitor's asks (or their share of the budget) are used up for today. `network`: so
 * many people on this network have asked, or spent, so much today that it has reached its own caps.
 * `resting`: the day's budget is spent, or the store can't be reached. `busy`: nothing is used up,
 * but asks still in flight hold that much of a cap (`full`) for the next few seconds.
 */
export type Admission =
  | { ok: true; asks: number }
  | { ok: false; code: DayLimit; /** The store couldn't be reached (fails closed). */ unavailable?: true }
  | { ok: false; code: "busy"; full: FullCap }

/**
 * What a reply came to: what it was charged up front, and what it really cost. `returnAsk`: the API
 * turned the call down before it started, through no doing of the visitor's, so the ask doesn't count
 * against their day (nor, if it was their first today, their device against the network's).
 */
export type Settlement = { chargedMicros: number; spentMicros: number; returnAsk?: boolean }

/** Where the counts live. Every method may throw (the store is down); callers fail closed. */
export interface LimitStore {
  /** The environment whose counts this store keeps (every key starts with it). */
  readonly environment: Environment
  /**
   * In one atomic step: refuse if this ask would pass any cap, else hold `micros` against the day,
   * the visitor and the network until the reply is over, and count the ask against the visitor and,
   * on the visitor's first ask of the day, the device against the network.
   */
  admit(payer: Payer, micros: number, caps: Caps): Promise<Admission>
  /**
   * Once the reply is over: release what was held against the day, the visitor and the network,
   * and add what it really cost to what each has spent. With `returnAsk`, the ask is given back too.
   */
  settle(payer: Payer, settlement: Settlement): Promise<void>
}

/** Counts are kept a little past their day, then expire on their own. */
const KEEP_SECONDS = 2 * 24 * 60 * 60
/** A store that doesn't answer in this long counts as down. */
const STORE_TIMEOUT_MS = 2000

/** The keys one ask touches in one environment, in the order the admission script reads them. */
export function keysFor(environment: Environment, { day, visitor, network }: Pick<Payer, "day" | "visitor" | "network">) {
  const ns = `jev:${environment}`
  return {
    spend: `${ns}:spend:${day}`,
    visitorAsks: `${ns}:asks:${day}:${visitor}`,
    networkDevices: `${ns}:net-devices:${day}:${network}`,
    visitorSpend: `${ns}:visitor-spend:${day}:${visitor}`,
    networkSpend: `${ns}:net-spend:${day}:${network}`,
    visitorHeld: `${ns}:visitor-held:${day}:${visitor}`,
    networkHeld: `${ns}:net-held:${day}:${network}`,
    held: `${ns}:held:${day}`,
  }
}

/**
 * The admission's rules, in order, from the counts as they stand: shared by the Redis script (which
 * runs the same steps in Lua) and the memory store. Every check comes before any count.
 */
type Counts = {
  /** What the day's replies really cost, settled. */
  spent: number
  /** What asks still in flight hold against the day. */
  held: number
  visitorAsks: number
  networkDevices: number
  visitorSpent: number
  visitorHeld: number
  networkSpent: number
  networkHeld: number
}

export function admission(c: Counts, charge: number, caps: Caps): Admission | null {
  const fresh = c.visitorAsks === 0
  // the day's limits, from what's really been spent: this ask's worst case has to fit what's left of
  // the budget and of each share (strict), and these hold until midnight
  if (c.spent + charge > caps.budgetMicros) return { ok: false, code: "resting" }
  if (c.visitorAsks + 1 > caps.visitorAsks || c.visitorSpent + charge > caps.visitorMicros) return { ok: false, code: "quota" }
  if ((fresh && c.networkDevices + 1 > caps.networkDevices) || c.networkSpent + charge > caps.networkMicros) return { ok: false, code: "network" }
  // a room full of asks still in flight: their worst cases are released within seconds
  if (c.held > 0 && c.spent + c.held + charge > caps.budgetMicros) return { ok: false, code: "busy", full: "budget" }
  if (c.visitorHeld > 0 && c.visitorSpent + c.visitorHeld + charge > caps.visitorMicros) return { ok: false, code: "busy", full: "visitor" }
  if (c.networkHeld > 0 && c.networkSpent + c.networkHeld + charge > caps.networkMicros) return { ok: false, code: "busy", full: "network" }
  return null
}

/**
 * The admission, as one Redis script (scripts run atomically), with `admission`'s rules. KEYS: the
 * day's settled spend, the visitor's asks, the network's devices, the visitor's and the network's
 * settled spend, what the visitor and the network have in flight, then what the whole day has in
 * flight. ARGV: the charge, the budget, the visitor's asks and share, the network's devices and
 * share, then how long the counts are kept. A visitor with no asks yet today is a device new to the
 * network today. Every check comes before any count, so a refused ask changes nothing.
 */
const ADMIT_SCRIPT = `
local charge = tonumber(ARGV[1])
local budget, visitorShare, networkShare = tonumber(ARGV[2]), tonumber(ARGV[4]), tonumber(ARGV[6])
local function num(key) return tonumber(redis.call('GET', key) or '0') end
local spent, held = num(KEYS[1]), num(KEYS[8])
local asks = num(KEYS[2])
local fresh = asks == 0
local visitorSpent, visitorHeld = num(KEYS[4]), num(KEYS[6])
local networkSpent, networkHeld = num(KEYS[5]), num(KEYS[7])
if spent + charge > budget then return {'resting', 0} end
if asks + 1 > tonumber(ARGV[3]) or visitorSpent + charge > visitorShare then return {'quota', asks} end
if (fresh and num(KEYS[3]) + 1 > tonumber(ARGV[5])) or networkSpent + charge > networkShare then return {'network', asks} end
if held > 0 and spent + held + charge > budget then return {'busy', asks, 'budget'} end
if visitorHeld > 0 and visitorSpent + visitorHeld + charge > visitorShare then return {'busy', asks, 'visitor'} end
if networkHeld > 0 and networkSpent + networkHeld + charge > networkShare then return {'busy', asks, 'network'} end
redis.call('INCRBY', KEYS[8], charge)
redis.call('INCR', KEYS[2])
if fresh then redis.call('INCR', KEYS[3]) end
redis.call('INCRBY', KEYS[6], charge)
redis.call('INCRBY', KEYS[7], charge)
for i = 2, 8 do redis.call('EXPIRE', KEYS[i], ARGV[7]) end
return {'ok', asks + 1}
`

/**
 * Gives an ask back, as one Redis script: the visitor's count goes down by one, and if that was
 * their only ask today, their device no longer counts against the network's day either (so it's
 * counted again, once, when it next asks). KEYS: the visitor's asks, the network's devices. Their
 * expiry is kept as it was.
 */
const RETURN_ASK_SCRIPT = `
local asks = tonumber(redis.call('GET', KEYS[1]) or '0')
if asks <= 0 then return 0 end
asks = redis.call('DECR', KEYS[1])
if asks == 0 and tonumber(redis.call('GET', KEYS[2]) or '0') > 0 then redis.call('DECR', KEYS[2]) end
return asks
`

const FULL_CAPS: readonly FullCap[] = ["budget", "visitor", "network"]

function admissionFrom(raw: unknown): Admission {
  if (!Array.isArray(raw) || raw.length < 2) throw new Error("unreadable admission")
  const [code, asks, full] = raw
  if (code === "ok" && Number.isFinite(Number(asks))) return { ok: true, asks: Number(asks) }
  if (code === "quota" || code === "network" || code === "resting") return { ok: false, code }
  if (code === "busy") {
    const cap = FULL_CAPS.find((c) => c === full)
    if (cap) return { ok: false, code: "busy", full: cap }
  }
  throw new Error("unreadable admission")
}

export function upstashStore(redis: Pick<Redis, "eval" | "pipeline">, environment: Environment): LimitStore {
  return {
    environment,
    async admit(payer, micros, caps) {
      const k = keysFor(environment, payer)
      const raw = await redis.eval(
        ADMIT_SCRIPT,
        [k.spend, k.visitorAsks, k.networkDevices, k.visitorSpend, k.networkSpend, k.visitorHeld, k.networkHeld, k.held],
        [
          Math.ceil(micros),
          caps.budgetMicros,
          caps.visitorAsks,
          caps.visitorMicros,
          caps.networkDevices,
          caps.networkMicros,
          KEEP_SECONDS,
        ],
      )
      return admissionFrom(raw)
    },
    async settle(payer, settlement) {
      const { charged, spent } = settled(settlement)
      const k = keysFor(environment, payer)
      await redis
        .pipeline()
        .incrby(k.held, -charged)
        .incrby(k.spend, spent)
        .expire(k.spend, KEEP_SECONDS)
        .incrby(k.visitorHeld, -charged)
        .incrby(k.networkHeld, -charged)
        .incrby(k.visitorSpend, spent)
        .expire(k.visitorSpend, KEEP_SECONDS)
        .incrby(k.networkSpend, spent)
        .expire(k.networkSpend, KEEP_SECONDS)
        .exec()
      if (settlement.returnAsk) await redis.eval(RETURN_ASK_SCRIPT, [k.visitorAsks, k.networkDevices], [])
    },
  }
}

/** A settlement in whole micro-dollars, as the counts keep them (the charge was rounded up). */
function settled({ chargedMicros, spentMicros }: Settlement): { charged: number; spent: number } {
  return { charged: Math.ceil(chargedMicros), spent: Math.max(0, Math.round(spentMicros)) }
}

/** For local development only: the same rules, counted in this process's memory. Never used on Vercel. */
export function memoryStore(environment: Environment = "development"): LimitStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>()
  const num = (key: string) => counts.get(key) ?? 0
  const add = (key: string, n: number) => counts.set(key, num(key) + n)
  return {
    environment,
    counts,
    async admit(payer, micros, caps) {
      const k = keysFor(environment, payer)
      const charge = Math.ceil(micros)
      // no await between the checks and the counts: one step, as in Redis
      const asks = num(k.visitorAsks)
      const refused = admission(
        {
          spent: num(k.spend),
          held: num(k.held),
          visitorAsks: asks,
          networkDevices: num(k.networkDevices),
          visitorSpent: num(k.visitorSpend),
          visitorHeld: num(k.visitorHeld),
          networkSpent: num(k.networkSpend),
          networkHeld: num(k.networkHeld),
        },
        charge,
        caps,
      )
      if (refused) return refused
      add(k.held, charge)
      add(k.visitorAsks, 1)
      if (asks === 0) add(k.networkDevices, 1)
      add(k.visitorHeld, charge)
      add(k.networkHeld, charge)
      return { ok: true, asks: asks + 1 }
    },
    async settle(payer, settlement) {
      const { charged, spent } = settled(settlement)
      const k = keysFor(environment, payer)
      add(k.held, -charged)
      add(k.spend, spent)
      add(k.visitorHeld, -charged)
      add(k.networkHeld, -charged)
      add(k.visitorSpend, spent)
      add(k.networkSpend, spent)
      if (settlement.returnAsk && num(k.visitorAsks) > 0) {
        add(k.visitorAsks, -1)
        if (num(k.visitorAsks) === 0 && num(k.networkDevices) > 0) add(k.networkDevices, -1)
      }
    },
  }
}

/**
 * The quota store's REST credentials, as the Vercel Marketplace (Upstash) injects them. Server-only.
 * The other injected `KV_*` and `REDIS_URL` values aren't read.
 */
function redisCredentials(env: Env): { url: string; token: string } | null {
  const url = env.KV_REST_API_URL
  const token = env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

let devStore: LimitStore | null = null

/**
 * The quota store for this deployment, counting in its own environment. Redis when it's configured.
 * Without it: null on Vercel (decisions rest: fail closed), and a per-process memory store on a
 * developer's machine.
 */
export function limitStoreFromEnv(env: Env = process.env): LimitStore | null {
  const environment = environmentFrom(env)
  const creds = redisCredentials(env)
  if (creds) {
    return upstashStore(
      new Redis({
        ...creds,
        retry: { retries: 1, backoff: () => 100 },
        signal: () => AbortSignal.timeout(STORE_TIMEOUT_MS),
        enableTelemetry: false,
      }),
      environment,
    )
  }
  if (env.VERCEL) return null
  if (devStore?.environment !== environment) devStore = memoryStore(environment)
  return devStore
}

/** The UTC day an ask counts against: "2026-10-07". */
export function utcDay(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

/** Seconds from `at` to the next UTC midnight, when the quota and the budget start over. */
export function secondsToTomorrow(at: number): number {
  const d = new Date(at)
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
  return Math.max(1, Math.ceil((midnight - at) / 1000))
}

/**
 * The seam for the public spend caps: charge this decision up front, if there's room for it today.
 * Any store failure rests decisions.
 */
export async function checkBudget({
  store,
  payer,
  micros,
  caps,
}: {
  store: LimitStore | null
  payer: Payer
  micros: number
  caps: Caps
}): Promise<Admission> {
  if (!store) return { ok: false, code: "resting", unavailable: true }
  try {
    return await store.admit(payer, micros, caps)
  } catch {
    return { ok: false, code: "resting", unavailable: true }
  }
}

// ---- who's asking (the device itself: device.ts) ----------------------------------------------------

/** The client's IP as the platform reports it. */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim()
  if (real) return real
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * The quota key: a hash of the IP and the device id, so neither is stored. A first ask arrives
 * without the cookie and is counted under the id it's about to be given, so visitors who share an
 * IP (an office, a mobile carrier) never share a quota. Dropping the cookie, or sending one the
 * server didn't sign, to start over runs into the network's cap on devices a day (`networkKey`).
 */
export async function visitorKey(ip: string, device: string): Promise<string> {
  return (await sha256Hex(`${ip}|${device}`)).slice(0, 32)
}

/**
 * The network an IP belongs to, as the per-network caps count it: an IPv4 address, or an IPv6
 * address's /48. A home or phone can use any address in its /64, and a site routed a /48 can use
 * any of its 65,536 /64s, so one holder of a block counts as one network, not thousands.
 */
export function networkOf(ip: string): string {
  const v4mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)
  if (v4mapped) return v4mapped[1]
  if (!ip.includes(":")) return ip
  const [head, tail = ""] = ip.toLowerCase().split("::")
  const left = head ? head.split(":") : []
  const right = tail ? tail.split(":") : []
  const groups = ip.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left
  return `${groups
    .slice(0, 3)
    .map((g) => (g || "0").replace(/^0+(?=.)/, ""))
    .join(":")}::/48`
}

/** Buckets the network caps count in: about a million, so a bucket stands for thousands of addresses. */
const NETWORK_BUCKET_HEX = 5

/**
 * The network's bucket: the first 20 bits of a hash of its address. Too few to tell which address
 * it came from (a plain hash of an IPv4 address can be reversed by trying them all), enough that
 * two networks rarely share one on the same day.
 */
export async function networkKey(ip: string): Promise<string> {
  return (await sha256Hex(`network|${networkOf(ip)}`)).slice(0, NETWORK_BUCKET_HEX)
}

// ---- what a decision cost ---------------------------------------------------------------------------

/** Jev on AI Gateway: $0.042 per million input tokens, output free. In millionths of a dollar per token. */
export const JEV_MICROS_PER_TOKEN = 0.042

/** The estimated cost of a decision, in millionths of a dollar, from the input tokens Jev reported. */
export function costMicros(inputTokens: number): number {
  return inputTokens * JEV_MICROS_PER_TOKEN
}

/**
 * The questions and criteria every decision sends, in tokens, rounded up (measured live: 900 to 970 per
 * call with the domains' criteria and a short message). They go with every decision, in front of the
 * visitor's message.
 */
export const FIXED_PROMPT_TOKENS = 1200
/** Bytes of the message per input token: one, a true floor, so no message can cost more than charged. */
export const BYTES_PER_TOKEN = 1
/** Attempts one decision can be billed for: the call and its one retry (`maxRetries: 1`). */
export const ATTEMPTS_PER_DECISION = 2

/** What a decision could cost at most, charged before the Jev call, from the message's bytes. */
export function worstCaseMicros(messageBytes: number): number {
  return ATTEMPTS_PER_DECISION * (FIXED_PROMPT_TOKENS + Math.ceil(messageBytes / BYTES_PER_TOKEN)) * JEV_MICROS_PER_TOKEN
}
