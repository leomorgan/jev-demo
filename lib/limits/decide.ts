// The decision endpoint's logic, with every service injected so it can be tested. The guards, in
// order: kill switch, cross-site, a capped and validated
// body, BotID, a signed device cookie, then the spend caps charged up front. Every "no" still serves a
// page: the visitor's pick if they made one, else the general help page.

import { z } from "zod"
import { bank } from "@/domains/bank/domain"
import { energy } from "@/domains/energy/domain"
import { isNeedId, type Domain } from "@/lib/domain"
import { MAX_MESSAGE_CHARS, type NeedDecision } from "@/lib/jev"
import { fallbackRoute, pickFrontEnd, type Route } from "@/lib/route"
import type { JevConfig } from "./config"
import { identifyDevice, type DeviceSigner } from "./device"
import {
  capsFrom,
  checkBudget,
  clientIp,
  costMicros,
  networkKey,
  utcDay,
  visitorKey,
  worstCaseMicros,
  type LimitStore,
  type Payer,
} from "./limits"

export const DOMAINS: Record<Domain["id"], Domain> = { energy, bank }

/** Why a search got the fallback page instead of Jev's pick. Shown in the developer drawer only. */
export type LimitReason = "disabled" | "bot" | "quota" | "network" | "resting" | "busy" | "unavailable"

export type DecideResponse =
  | { status: "ok"; decision: NeedDecision; route: Route }
  | { status: "limited"; reason: LimitReason; route: Route }
  | { status: "invalid" }

export type DecideDeps = {
  config: JevConfig
  /** Null when there's no quota store: decisions rest (fail closed). */
  limits: LimitStore | null
  /** Null when there's no cookie secret on Vercel: decisions rest. */
  devices: DeviceSigner | null
  isBot: () => Promise<boolean>
  decide: (domain: Domain, message: string, signal: AbortSignal) => Promise<NeedDecision>
  log: (line: Record<string, unknown>) => void
  now: () => number
  /** Runs work after the response is sent and keeps the function alive for it (Next's `after`). */
  defer: (task: () => Promise<void>) => void
}

const MAX_BODY_BYTES = 2048
export const DECISION_TIMEOUT_MS = 5000

const bodySchema = z.object({
  domain: z.enum(["energy", "bank"]),
  q: z.string(),
  need: z.string().optional(),
})

function json(body: DecideResponse, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } })
}

/**
 * A request that didn't come from the app's own pages. Browsers say where a request comes from
 * (`Sec-Fetch-Site`, `Origin`), and only a JSON body makes a cross-site `fetch` ask permission first
 * (a CORS preflight, which this endpoint never grants). So another site can't spend the budget from
 * its visitors' browsers. Tools that send neither header still meet the bot check and the spend caps.
 */
export function crossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site")
  if (site !== null && site !== "same-origin") return true
  const origin = request.headers.get("origin")
  if (origin !== null) {
    let from: string
    try {
      from = new URL(origin).host
    } catch {
      return true
    }
    const ours = [request.headers.get("host"), request.headers.get("x-forwarded-host")?.split(",")[0]?.trim(), new URL(request.url).host]
    if (!ours.includes(from)) return true
  }
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
  return type !== "application/json"
}

async function readCapped(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null
  const text = await request.text()
  return new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES ? null : text
}

/** The call never started on the provider's side (it answered with an HTTP error): not billed. */
function turnedDown(error: unknown): boolean {
  return typeof (error as { statusCode?: unknown })?.statusCode === "number"
}

export async function handleDecide(request: Request, deps: DecideDeps): Promise<Response> {
  const started = deps.now()
  const log = (fields: Record<string, unknown>) => deps.log({ event: "jev_decision", latency_ms: deps.now() - started, ...fields })

  if (crossSite(request)) {
    log({ status: 403, outcome: "cross_site" })
    return json({ status: "invalid" }, 403)
  }
  const raw = await readCapped(request)
  let parsed: z.infer<typeof bodySchema> | null = null
  try {
    const result = raw === null ? null : bodySchema.safeParse(JSON.parse(raw))
    parsed = result?.success ? result.data : null
  } catch {}
  const message = parsed?.q.trim() ?? ""
  if (!parsed || !message || message.length > MAX_MESSAGE_CHARS) {
    log({ status: 400, outcome: "invalid" })
    return json({ status: "invalid" }, 400)
  }
  const domain = DOMAINS[parsed.domain]
  const chosen = isNeedId(domain, parsed.need) ? parsed.need : undefined
  const limited = (reason: LimitReason, headers: Record<string, string> = {}) => {
    log({ status: 200, outcome: reason, domain: domain.id })
    return json({ status: "limited", reason, route: fallbackRoute(domain, chosen) }, 200, headers)
  }

  if (!deps.config.enabled) return limited("disabled")

  if (deps.config.onVercel) {
    let bot: boolean
    try {
      bot = await deps.isBot()
    } catch {
      return limited("busy")
    }
    if (bot) return limited("bot")
  }

  // no secret for the device cookie: it couldn't tell its own cookies from made-up ones
  if (!deps.devices) return limited("disabled")

  // who's asking: an IP and a device the server signed, hashed together, and the IP's network in a
  // coarse bucket (neither address is kept). A cookie it didn't sign is a new device.
  const { device, setCookie } = await identifyDevice(request, deps.devices)
  const cookie: Record<string, string> = setCookie ? { "set-cookie": setCookie } : {}
  const ip = clientIp(request)
  const at = deps.now()
  const [visitor, network] = await Promise.all([visitorKey(ip, device), networkKey(ip)])
  const payer: Payer = { day: utcDay(at), visitor, network }

  // charged up front with the most this decision could cost, in one atomic step with the checks
  const charged = Math.ceil(worstCaseMicros(new TextEncoder().encode(message).byteLength))
  const budget = await checkBudget({ store: deps.limits, payer, micros: charged, caps: capsFrom(deps.config) })
  if (!budget.ok) return limited("unavailable" in budget && budget.unavailable ? "unavailable" : budget.code, cookie)

  let decision: NeedDecision
  try {
    decision = await deps.decide(domain, message, AbortSignal.any([request.signal, AbortSignal.timeout(DECISION_TIMEOUT_MS)]))
  } catch (error) {
    // turned down by the provider before it started: unbilled, so the decision is given back. A
    // timeout or anything else may have been billed: the worst case stays charged.
    const returnAsk = turnedDown(error)
    deps.defer(async () => {
      try {
        await deps.limits?.settle(payer, { chargedMicros: charged, spentMicros: returnAsk ? 0 : charged, returnAsk })
      } catch {}
    })
    console.error("Jev decision failed", error)
    return limited("unavailable", cookie)
  }

  const route = pickFrontEnd(domain, decision, chosen)
  const spent = decision.inputTokens == null ? charged : costMicros(decision.inputTokens)
  // settle and log once the response is out. One usage line per paid call; never the visitor's text.
  deps.defer(async () => {
    try {
      await deps.limits?.settle(payer, { chargedMicros: charged, spentMicros: spent })
    } catch {}
    log({
      status: 200,
      outcome: "ok",
      domain: domain.id,
      need: decision.need,
      confidence: decision.needConfidence,
      frontEnd: route.frontEnd,
      care: route.care,
      urgent: route.urgent,
      picked: chosen ?? null,
      jev_ms: decision.ms,
      input_tokens: decision.inputTokens,
      charged_micros: charged,
      spent_micros: Math.round(spent),
      asks_today: budget.asks,
    })
  })
  return json({ status: "ok", decision, route }, 200, cookie)
}
