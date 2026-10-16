import { bank } from "../domains/bank/domain";
import { energy } from "../domains/energy/domain";
import type { Domain } from "../lib/domain";

export const DOMAINS: Record<string, Domain> = { energy, bank };

/** `energy` (default) or `bank`; exits with usage on anything else. */
export function domainArg(value: string | undefined): Domain {
  const domain = DOMAINS[value ?? "energy"];
  if (!domain) {
    console.error(`Unknown domain "${value}". Use one of: ${Object.keys(DOMAINS).join(", ")}`);
    process.exit(2);
  }
  return domain;
}
