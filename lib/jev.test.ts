import { Experimental_DecisionMockModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { bank } from "@/domains/bank/domain";
import { energy } from "@/domains/energy/domain";
import { needIds } from "./domain";
import { classifyNeed, questionsFor } from "./jev";

const jevLike = (confidence?: Record<string, number>) =>
  new Experimental_DecisionMockModelV4({
    provider: "typesafe-ai",
    modelId: "jev",
    supportedQuestionTypes: ["choice", "score", "boolean"],
    doDecide: async ({ questions }) => {
      expect(Object.keys(questions)).toEqual(["need", "urgency", "distress"]);
      return {
        answers: {
          need: {
            type: "choice",
            choice: "payment_support",
            probabilities: {
              outage: 0,
              bill_shock: 0.2,
              moving_home: 0,
              switching: 0,
              payment_support: 0.8,
              other: 0,
              unclear: 0,
            },
          },
          urgency: { type: "score", score: 1.6, probabilities: { "0": 0, "1": 0.4, "2": 0.6 } },
          distress: { type: "boolean", probability: 0.93 },
        },
        usage: { inputTokens: 400 },
        warnings: [],
        providerMetadata: confidence ? { typesafe: { confidence } } : undefined,
      };
    },
  });

describe("questionsFor", () => {
  it("offers each domain's own needs as the choice options", () => {
    expect(Object.keys(questionsFor(energy).need.criteria)).toEqual(needIds(energy));
    expect(Object.keys(questionsFor(bank).need.criteria)).toEqual(needIds(bank));
    expect(questionsFor(bank).need.instructions).toMatch(/bank customer/);
  });
});

describe("classifyNeed", () => {
  it("maps Jev's typed answers onto a decision", async () => {
    const d = await classifyNeed(energy, "I can't pay this month", { model: jevLike({ need: 0.71, urgency: 0.4 }) });
    expect(d.need).toBe("payment_support");
    expect(d.needConfidence).toBe(0.71);
    expect(d.needProbabilities.bill_shock).toBe(0.2);
    expect(d.urgency).toBe(1.6);
    expect(d.distress).toBe(0.93);
    expect(d.inputTokens).toBe(400);
    expect(d.costUsd).toBeCloseTo(400 * 0.042e-6);
  });

  it("falls back to the chosen option's probability when no confidence is returned", async () => {
    const d = await classifyNeed(energy, "I can't pay", { model: jevLike() });
    expect(d.needConfidence).toBe(0.8);
  });

  it("treats a model that returns no distribution as not confident, so the page asks", async () => {
    const llmLike = new Experimental_DecisionMockModelV4({
      supportedQuestionTypes: ["choice", "score", "boolean"],
      doDecide: async () => ({
        answers: {
          need: { type: "choice", choice: "outage" },
          urgency: { type: "score", score: 1 },
          distress: { type: "boolean", probability: 0.1 },
        },
        warnings: [],
      }),
    });
    const d = await classifyNeed(energy, "no power", { model: llmLike });
    expect(d.need).toBe("outage");
    expect(d.needConfidence).toBe(0);
    expect(d.needProbabilities.outage).toBe(0);
  });

  it("caps the message it sends", async () => {
    const d = await classifyNeed(energy, "x".repeat(2000), { model: jevLike() });
    expect(d.state.message).toHaveLength(500);
  });
});
