import { pickableNeeds, type Domain } from "./domain";
import type { NeedDecision } from "./jev";

// Jev decides; this code acts. Thresholds live here, not in prompts, so they can be
// tuned against the labelled sets in evals/ (pnpm eval <domain>).
// Jev usually asks via the explicit `unclear` option (its confidence saturates near 1.00);
// this gate catches models that return low or no confidence.
export const CLARIFY_BELOW = 0.5; // need confidence under this → ask, don't guess
// Live eval: can't-pay messages scored 0.87–0.98, everything else ≤ 0.36.
export const CARE_AT = 0.7; // P(distress) at or over this → care mode
// Live eval (22 messages): intended-urgent scored ≥ 1.69, the rest ≤ 1.51, so cut in the gap.
export const URGENT_AT = 1.6; // urgency score (0–2) at or over this → urgent mode

export interface Route {
  frontEnd: string;
  care: boolean;
  urgent: boolean;
  /** For clarify: every pickable need, likeliest first. */
  alternatives: string[];
  /** Human-readable trace of the rules that fired, for the x-ray panel. */
  rule: string[];
}

type Signals = Pick<NeedDecision, "need" | "needProbabilities" | "needConfidence" | "urgency" | "distress">;

/** `chosen`: a need the person picked on the clarify screen; it overrides Jev's choice. */
export function pickFrontEnd(domain: Domain, d: Signals, chosen?: string): Route {
  const care = d.distress >= CARE_AT;
  const urgent = d.urgency >= URGENT_AT;
  const rule: string[] = [];

  let frontEnd: string;
  if (chosen) {
    frontEnd = domain.needs[chosen].frontEnd;
    rule.push(`need = ${chosen}, picked by the person on the clarify screen → ${frontEnd}`);
  } else if (d.needConfidence < CLARIFY_BELOW) {
    frontEnd = "clarify";
    rule.push(`need confidence ${d.needConfidence.toFixed(2)} < ${CLARIFY_BELOW} → clarify`);
  } else {
    frontEnd = domain.needs[d.need].frontEnd;
    rule.push(`need = ${d.need} (confidence ${d.needConfidence.toFixed(2)} ≥ ${CLARIFY_BELOW}) → ${frontEnd}`);
  }
  if (care) rule.push(`distress ${d.distress.toFixed(2)} ≥ ${CARE_AT} → care mode`);
  if (urgent) rule.push(`urgency ${d.urgency.toFixed(2)} ≥ ${URGENT_AT} → urgent mode`);

  const alternatives = pickableNeeds(domain).sort((a, b) => (d.needProbabilities[b] ?? 0) - (d.needProbabilities[a] ?? 0));

  return { frontEnd, care, urgent, alternatives, rule };
}

/** Jev failed or timed out: serve what the person picked if they picked something, else the general page. */
export function fallbackRoute(domain: Domain, chosen?: string): Route {
  const frontEnd = chosen ? domain.needs[chosen].frontEnd : "general";
  return {
    frontEnd,
    care: false,
    urgent: false,
    alternatives: pickableNeeds(domain),
    rule: [chosen ? `Jev unavailable; need = ${chosen} was picked → ${frontEnd}` : `Jev unavailable → ${frontEnd}`],
  };
}
