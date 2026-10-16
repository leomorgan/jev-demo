import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BANK_FRONT_ENDS } from "@/domains/bank/frontends";
import { bank } from "@/domains/bank/domain";
import { ENERGY_FRONT_ENDS } from "@/domains/energy/frontends";
import { energy } from "@/domains/energy/domain";
import { isNeedId, needIds, pickableNeeds, type Domain } from "./domain";

const DOMAINS: [Domain, Record<string, unknown>][] = [
  [energy, ENERGY_FRONT_ENDS],
  [bank, BANK_FRONT_ENDS],
];

describe.each(DOMAINS)("%s", (domain, registry) => {
  it("has the two needs every front door relies on", () => {
    expect(domain.needs.other.frontEnd).toBe("general");
    expect(domain.needs.unclear.frontEnd).toBe("clarify");
  });

  it("routes every need to a front end that exists", () => {
    for (const id of needIds(domain)) expect(registry).toHaveProperty(domain.needs[id].frontEnd);
    expect(registry).toHaveProperty("general");
  });

  it("accepts catalogue ids only, not inherited object keys", () => {
    expect(isNeedId(domain, needIds(domain)[0])).toBe(true);
    for (const bad of ["constructor", "toString", "__proto__", "valueOf", "", undefined, ["other"]]) {
      expect(isNeedId(domain, bad)).toBe(false);
    }
  });

  it("offers every real need on the clarify page, never other or unclear", () => {
    expect(pickableNeeds(domain)).toEqual(needIds(domain).filter((id) => id !== "other" && id !== "unclear"));
  });

  // An option example that matches an eval message lets the eval mark its own homework.
  it("keeps option examples out of the eval set", () => {
    const evalMessages: string[] = JSON.parse(readFileSync(`evals/${domain.id}.json`, "utf8")).map(
      (c: { message: string }) => c.message.toLowerCase(),
    );
    for (const id of needIds(domain)) {
      const examples = (domain.needs[id].criteria as { examples?: string[] }).examples ?? [];
      for (const ex of examples) {
        for (const m of evalMessages) expect(m.includes(ex.toLowerCase()), `"${ex}" is inside "${m}"`).toBe(false);
      }
    }
  });
});
