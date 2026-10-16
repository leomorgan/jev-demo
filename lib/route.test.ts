import { describe, expect, it } from "vitest";
import { bank } from "@/domains/bank/domain";
import { energy } from "@/domains/energy/domain";
import { needIds, type Domain } from "./domain";
import { fallbackRoute, pickFrontEnd } from "./route";

function signals(domain: Domain, need: string, confidence: number, extra: { urgency?: number; distress?: number } = {}) {
  const needProbabilities = Object.fromEntries(needIds(domain).map((id) => [id, id === need ? 0.6 : 0.08]));
  return { need, needProbabilities, needConfidence: confidence, urgency: 0, distress: 0, ...extra };
}

describe("pickFrontEnd", () => {
  it("serves the need's front end when Jev is confident", () => {
    expect(pickFrontEnd(energy, signals(energy, "bill_shock", 0.8)).frontEnd).toBe("bill");
    expect(pickFrontEnd(energy, signals(energy, "outage", 0.9)).frontEnd).toBe("outage");
    expect(pickFrontEnd(energy, signals(energy, "other", 0.9)).frontEnd).toBe("general");
    expect(pickFrontEnd(bank, signals(bank, "lost_card", 1)).frontEnd).toBe("card");
    expect(pickFrontEnd(bank, signals(bank, "saving", 1)).frontEnd).toBe("pots");
  });

  it("asks instead of guessing when confidence is low, offering every need, likeliest first", () => {
    const route = pickFrontEnd(energy, signals(energy, "moving_home", 0.3));
    expect(route.frontEnd).toBe("clarify");
    expect(route.alternatives[0]).toBe("moving_home");
    expect(route.alternatives).not.toContain("other");
    expect(route.alternatives).not.toContain("unclear");
    expect(route.alternatives).toHaveLength(5);
  });

  it("asks when Jev picks the explicit unclear option, even at full confidence", () => {
    expect(pickFrontEnd(energy, signals(energy, "unclear", 1)).frontEnd).toBe("clarify");
    expect(pickFrontEnd(bank, signals(bank, "unclear", 1)).frontEnd).toBe("clarify");
  });

  it("lets the person's clarify pick override Jev, keeping care and urgency", () => {
    const route = pickFrontEnd(energy, signals(energy, "other", 0.2, { distress: 0.9 }), "payment_support");
    expect(route.frontEnd).toBe("support");
    expect(route.care).toBe(true);
  });

  it("turns on care and urgent modes at their thresholds", () => {
    expect(pickFrontEnd(energy, signals(energy, "bill_shock", 0.8, { distress: 0.7 })).care).toBe(true);
    expect(pickFrontEnd(energy, signals(energy, "bill_shock", 0.8, { distress: 0.69 })).care).toBe(false);
    expect(pickFrontEnd(energy, signals(energy, "outage", 0.8, { urgency: 1.6 })).urgent).toBe(true);
    expect(pickFrontEnd(energy, signals(energy, "outage", 0.8, { urgency: 1.51 })).urgent).toBe(false);
  });
});

describe("fallbackRoute", () => {
  it("serves the general page when Jev fails and nothing was picked", () => {
    expect(fallbackRoute(energy).frontEnd).toBe("general");
    expect(fallbackRoute(bank).frontEnd).toBe("general");
  });

  it("still serves the person's clarify pick when Jev fails", () => {
    const route = fallbackRoute(bank, "fraud");
    expect(route.frontEnd).toBe("fraud");
    expect(route.care).toBe(false);
  });
});
