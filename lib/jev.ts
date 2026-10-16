import { experimental_decide as decide, type Experimental_DecisionModel } from "ai";
import { DISTRESS_CRITERIA, URGENCY_LEVELS, needIds, type Domain } from "./domain";

// Jev on Vercel AI Gateway. Auth: VERCEL_OIDC_TOKEN (vercel env pull) or AI_GATEWAY_API_KEY;
// on Vercel itself, the project's OIDC identity.
export const JEV_MODEL = "typesafe-ai/jev";
// $0.042 per 1M input tokens; Jev has no output tokens.
const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;
export const MAX_MESSAGE_CHARS = 500;

export interface NeedDecision {
  need: string;
  needProbabilities: Record<string, number>;
  needConfidence: number;
  urgency: number; // 0..2 on URGENCY_LEVELS, probability-weighted
  distress: number; // P(true)
  ms: number;
  inputTokens?: number;
  costUsd?: number;
  state: { message: string };
}

// All three questions are answered in parallel in one call, so asking more costs tokens, not time.
export function questionsFor(domain: Domain) {
  return {
    need: {
      type: "choice" as const,
      instructions: domain.needInstructions,
      criteria: Object.fromEntries(needIds(domain).map((id) => [id, domain.needs[id].criteria])),
    },
    urgency: {
      type: "score" as const,
      instructions: "How soon does the person need this resolved?",
      criteria: [...URGENCY_LEVELS],
    },
    distress: {
      type: "boolean" as const,
      instructions: "Is the person in distress?",
      criteria: DISTRESS_CRITERIA,
    },
  };
}

export async function classifyNeed(
  domain: Domain,
  message: string,
  { model = JEV_MODEL, signal }: { model?: string | Experimental_DecisionModel; signal?: AbortSignal } = {},
): Promise<NeedDecision> {
  const state = { message: message.slice(0, MAX_MESSAGE_CHARS) };
  const t0 = performance.now();
  const result = await decide({ model, state, questions: questionsFor(domain), abortSignal: signal, maxRetries: 1 });
  const ms = Math.round(performance.now() - t0);

  const { need, urgency, distress } = result.answers;
  const confidence = (result.providerMetadata?.typesafe as { confidence?: Record<string, number> } | undefined)
    ?.confidence;
  // Language-model fallbacks return no distribution; never invent one.
  const needProbabilities = Object.fromEntries(needIds(domain).map((id) => [id, need.probabilities?.[id] ?? 0]));
  const inputTokens = result.usage.inputTokens;

  return {
    need: need.choice,
    needProbabilities,
    // Jev returns confidence; other decision models may only return a distribution, so fall
    // back to the chosen option's probability. With neither, treat it as 0 (ask, don't guess),
    // as Gateway's TypeSafe-compatible API marks "unavailable".
    needConfidence: confidence?.need ?? (need.probabilities ? needProbabilities[need.choice] : 0),
    urgency: urgency.score,
    distress: distress.probability,
    ms,
    inputTokens,
    costUsd: inputTokens == null ? undefined : inputTokens * USD_PER_INPUT_TOKEN,
    state,
  };
}
