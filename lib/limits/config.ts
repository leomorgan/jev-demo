// The decision endpoint's switches and caps, read from the environment.

export type JevConfig = {
  /** The kill switch. Off, every search gets the general help page and Jev is never called. */
  enabled: boolean
  /** Decisions per visitor per UTC day. */
  visitorDailyLimit: number
  /** Estimated spend per UTC day, in dollars, before decisions rest until tomorrow. */
  dailyBudgetUsd: number
  /** Deployed on Vercel: the bot check runs and the quota store is required. */
  onVercel: boolean
}

/** A visitor rarely needs more than a few searches; a curious one might try a few dozen. */
export const DEFAULT_VISITOR_DAILY_LIMIT = 40
export const DEFAULT_DAILY_BUDGET_USD = 2

type Env = Record<string, string | undefined>

function positive(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  return raw !== undefined && raw.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback
}

/** `JEV_ENABLED` is on unless set to false, 0, off or no. */
function enabled(raw: string | undefined): boolean {
  return !/^(false|0|off|no)$/i.test((raw ?? "").trim())
}

export function configFromEnv(env: Env = process.env): JevConfig {
  return {
    enabled: enabled(env.JEV_ENABLED),
    visitorDailyLimit: Math.floor(positive(env.JEV_VISITOR_DAILY_LIMIT, DEFAULT_VISITOR_DAILY_LIMIT)),
    dailyBudgetUsd: positive(env.JEV_DAILY_BUDGET_USD, DEFAULT_DAILY_BUDGET_USD),
    onVercel: Boolean(env.VERCEL),
  }
}
