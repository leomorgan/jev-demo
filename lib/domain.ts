import type { Experimental_DecisionQuestion } from "ai";

/** What one choice option's description may be, as the AI SDK defines it. */
type NeedCriteria = NonNullable<Extract<Experimental_DecisionQuestion, { type: "choice" }>["criteria"][string]>;

// A domain is one "front door": the needs Jev chooses between, the front end each serves,
// and the copy around it. Pure data, so scripts and tests can import it without React.

export interface NeedDef {
  label: string;
  /** One line for the topic list in the app; Jev never reads it. */
  hint?: string;
  /** Front-end id in the domain's registry. `clarify` asks a one-tap question. */
  frontEnd: string;
  /** What Jev reads for this option. Keep `examples` different from every eval message. */
  criteria: NeedCriteria;
}

export interface Domain {
  id: "energy" | "bank";
  name: string;
  /** Route of the front door, e.g. "/energy". */
  path: string;
  /** The choice question Jev answers. */
  needInstructions: string;
  /** Must include `other` (a clear request that fits nothing else) and `unclear` (too vague). */
  needs: Record<string, NeedDef>;
  presets: readonly { label: string; q: string }[];
  placeholder: string;
  care: { title: string; text: string };
}

export const URGENCY_LEVELS = [
  "Just exploring, no time pressure",
  "Wants it sorted in the next few days",
  "Needs help right now, today",
] as const;

// Jev reads literally and stumbles on negation, so the boundary lives in the criteria.
export const DISTRESS_CRITERIA = {
  true: "Says they are worried, scared, struggling, or cannot afford something",
  false: "Calm, curious, or only annoyed about a price or a company",
} as const;

export function needIds(domain: Domain): string[] {
  return Object.keys(domain.needs);
}

export function isNeedId(domain: Domain, value: unknown): value is string {
  // Own keys only: `in` would also accept "constructor", "toString", … from the prototype.
  return typeof value === "string" && Object.hasOwn(domain.needs, value);
}

/** The needs a person can pick on the clarify page. */
export function pickableNeeds(domain: Domain): string[] {
  return needIds(domain).filter((id) => id !== "other" && domain.needs[id].frontEnd !== "clarify");
}
