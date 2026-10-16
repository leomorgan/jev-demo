# Jev: research notes

Checked 2026-10-09 against primary docs and the installed `ai@7.0.133`. Jev is three weeks old
and its SDK surface is still moving (see "API churn"), so trust `node_modules/ai/docs` over blog posts.

## What it is

Jev is TypeSafe AI's **"System One" decision model**, launched 15 Sep 2026 and on Vercel AI Gateway
from 16 Sep as `typesafe-ai/jev`. It does **not generate text**. You send one **state** (text or JSON)
and a set of named, **typed questions**; it returns a typed answer for each one, with probabilities.

| Type | You give | You get |
|---|---|---|
| `choice` | `instructions` + `criteria`: map of option → description (≤ 255 options) | `choice` (typed as the union of your keys), `probabilities` over every option |
| `score` | `instructions` + `criteria`: ordered levels, low → high (2–10) | `score`, a probability-weighted fractional level, + `probabilities` |
| `boolean` (TypeSafe calls it `noul`) | `instructions`, optional `criteria: { true, false }` | `probability` = P(true) |

All questions in a call are evaluated **in parallel and independently** against the same state, so
adding a question adds tokens but barely any latency. Answers are constrained to the options you
supplied, but refusals and malformed responses still happen: the SDK throws `Experimental_DecisionRefusalError`
or `InvalidResponseDataError`, so the caller needs a fallback (ours serves the general page).

**Confidence** is separate from probability, at `result.providerMetadata.typesafe.confidence[questionId]`,
for choice and score only. For a choice over *n* options it is `(p_max − 1/n) / (1 − 1/n)`: the top option's
probability rescaled so that a uniform guess scores 0 ([docs](https://docs.typesafe.ai/confidence.md)).
TypeSafe's example thresholds, to be tuned on your own data: below ~0.5 → hand to a human or ask;
read-only actions can act at moderate confidence; high-stakes actions confirm first (their example
still confirms above 0.9).

## Numbers

| | |
|---|---|
| Price | $0.042 / 1M input tokens, **$0 output** (Gateway = TypeSafe direct rate). Our ~900-token decision ≈ $0.000038 (measured) |
| Latency | TypeSafe claims 70–500 ms end to end. Independent: p50 127 / p95 231 ms client-side in LiteLLM's benchmark ([link](https://docs.litellm.ai/blog/jev-auto-router-benchmark), location not stated); 107–204 ms at the provider but 716–1,078 ms round trips in [ANGULARarchitects' test](https://www.angulararchitects.io/blog/using-jev-for-agentic-ui-just-a-trend-or-a-game-changer/); p50 370 / p95 744 ms via OpenRouter ([jev-certify](https://github.com/nikkoxgonzales/jev-certify)). **Plan for 0.2–1 s from the browser's point of view until we measure our own** |
| Context | 64k per request; the state plus the longest question must fit in 32k ([models](https://docs.typesafe.ai/models.md)). The Gateway model page lists 32k total |
| Current model | jev-1.13.0; `jev-latest` floats, version pinning supported on the direct API |
| Input | text and JSON only, English best |

## Access routes

1. **Vercel AI Gateway + AI SDK** (what this repo uses). `experimental_decide({ model: "typesafe-ai/jev", state, questions })`
   from `ai` ≥ 7.0.128. Auth is `VERCEL_OIDC_TOKEN` (`vercel link` + `vercel env pull`) or `AI_GATEWAY_API_KEY`.
   Shows up in Gateway logs and budgets. Supports per-request ZDR (Pro/Enterprise only) and no-training
   (`providerOptions.gateway`) and **decision fallbacks**: one conditional model in `providerOptions.gateway.models`
   (e.g. `confidenceBelow: 0.6`) that re-asks another decision or language model when Jev is unsure; both calls
   are billed, and a language-model fallback returns no probabilities or confidence (our code then treats
   confidence as 0 and asks)
   ([docs](https://vercel.com/docs/ai-gateway/models-and-providers/decision-fallbacks)).
2. **Gateway HTTP**: `POST https://ai-gateway.vercel.sh/v1/evaluate`, plus a TypeSafe-compatible endpoint at
   `/typesafe/v1/systemone` ([docs](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe)).
3. **TypeSafe direct**: `POST https://api.typesafe.ai/v1/systemone`, the Python `typesafe-sdk` and JS `@typesafe-ai/sdk`,
   or `@ai-sdk/typesafe-ai` → `typeSafeAi.decisionModel("jev-latest")`. Signups paused around 22 Sep and
   reopened by about 27 Sep.
4. Others: OpenRouter, Cloudflare Workers AI (`typesafe/jev`), LangChain, Pydantic AI. Open-weight and rival decision models
   (Laya, a 421M encoder; Kev, Qwen-based; Cloudflare's Clef) are cheaper per decision; accuracy comparisons
   between them are self-reported and conflict, so treat any ranking as unproven.

### API churn: read this before copying from the web
- **AI SDK renamed `experimental_evaluate` → `experimental_decide`** in `ai` 7.0.128 (5 Oct), along with
  `evaluationModel` → `decisionModel` and `Experimental_EvaluationMockModelV4` → `Experimental_DecisionMockModelV4`.
  The old names are deprecated aliases. Every blog post and Vercel guide from September uses the old names.
- Gateway docs moved from "evaluation" to "decision" modality.

## Setup gotchas we hit (in order)

1. **Node 22+ and ESM.** AI SDK 7 needs both, so `"type": "module"` goes in package.json.
2. **pnpm's `minimumReleaseAge`.** `ai` released 34 versions between 14 Sep and 9 Oct (up to 3 a day). Pinning
   one less than a day old made pnpm 11.10 add `minimumReleaseAgeExclude` entries to `pnpm-workspace.yaml`
   (it printed a one-line notice), and the next install rejected the lockfile
   (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`). Pin a version older than a day instead (we use 7.0.133).
3. **Two 403s before the first answer.** AI Gateway won't serve any request until the Vercel team has a
   **credit card on file** (`customer_verification_required`). With a card but only free credits, Jev is still
   refused (`RestrictedModelsError`: "Free tier users do not have access to this model"): **Jev needs paid
   Gateway credits**. Community threads also report Hobby-team 403s with no logs and suspended access,
   unresolved as of 4 Oct; if paid credits don't fix it, open a support ticket.
4. **The OIDC token expires after 12 h locally.** Re-run `vercel env pull .env.local` on a 401.
5. **Next 16 Cache Components.** The SDK mints random request ids, so a decision inside a prerenderable
   tree errors with "unstable value `Math.random()`". Call `await connection()` before deciding.

## Writing good questions (TypeSafe guidance + Jev 1.13 "jaggedness")

- **Atomic questions, combined in code.** Don't ask "which page should we show?". Ask for need, urgency and
  distress separately and keep the weights and thresholds in code, where they can be tuned and tested.
- **State is data, questions are judgements.** Send an object with descriptive keys, only the fields the
  question needs: irrelevant detail measurably hurts accuracy. Never splice live data into instructions.
- **Make options separable.** For confusable options use an object per option with the same fields
  (`covers`, `excludes`, `examples`). Add an `other` option when the list may not cover every input.
- **Score levels describe situations, not degrees.** Use "Needs help right now, today", not "High".
  Avoid bare numbers.
- **Known weak spots:** literal reading (it answers the words, not the intent); negation and double
  negatives (put boundaries in `criteria`, not "X is not Y" in the instructions); counting, maths and date
  comparison (do those in code); first-option bias in choices (reorder and check consistency);
  injected instructions inside the state (it doesn't treat state as hostile).
- **Calibrate on your own labelled data.** One independent study found Jev returns exactly 1.0 on about 56% of
  answers, some of them wrong, so a high probability is not proof. Thresholds come from evals, not intuition.

## What we measured (9 Oct 2026, from London, `pnpm eval`)

| | |
|---|---|
| Accuracy | First run 17/18. The miss: a vague message ("I need to sort something out with my account") went to `other` at confidence 1.00 instead of Clarify. After adding an explicit `unclear` option and rewriting criteria examples that overlapped eval messages: **22/22** |
| Confidence | 0.98–1.00 on every answer, vague ones included. It saturates, so a confidence threshold alone almost never asks; an explicit "too vague" option does |
| Distress (boolean) | Can't-pay messages 0.87–0.98; everything else ≤ 0.36. The 0.7 care threshold sits in a clean gap |
| Urgency (score) | Intended-urgent messages ≥ 1.69; others ≤ 1.51 (two sat at 1.47 and 1.51, right on the old 1.5 line). Threshold moved to 1.6 |
| Latency | p50 313 ms, p95 459 ms per call, one at a time (22 calls). The first call of a session was 576 ms |
| Tokens and cost | ~900 input tokens per decision (the structured criteria dominate) ≈ $0.000038 |

Caveats: 22 messages written by us is a regression check, not an accuracy claim. An early version of the
criteria `examples` paraphrased eval messages, which inflates scores; they are now kept distinct.

## Where it fits for "classify needs → serve a front end"

Jev is close to ideal for a runtime routing decision: a closed set of outcomes, ~0.3 s measured, about $0.00004
per visitor, typed results the router can switch on, and confidence that tells you when to ask instead of
guessing. We found no published case study of UI personalisation with measured user outcomes. The nearest
examples are a flight-dashboard spot check that decides tile visibility, with timings but no outcome measures
([ANGULARarchitects](https://www.angulararchitects.io/blog/using-jev-for-agentic-ui-just-a-trend-or-a-game-changer/)),
and json-render's composer.

Two ways to apply it:

| | A. Route to hand-built front ends (this repo) | B. Compose the page (json-render + Jev) |
|---|---|---|
| What Jev decides | Which of N React front ends to serve, and in which modes (care, urgent) | Which pre-written component candidates to use, and where they go in a layout tree |
| UI quality | Full design control: every front end is designed and reviewed | Bounded by the candidate set and the layout rules |
| Maturity | Stable pattern, about 100 lines | `experimental_composeSpec` / `experimental_createEvaluator` in `@json-render/core` 0.21.0, docs still say "unreleased" |
| HeroUI | Native | **No HeroUI adapter exists** (only shadcn): we'd write a HeroUI catalog and registry |
| Calls | 1 | Up to 2 with the `batch` strategy (select, then layout), more with `sequential` |

Recommendation: **demo A now**, and treat B as the follow-on that shows "the same design system,
composed per visitor". B's main dependency is a HeroUI catalog for json-render, which fits
Affordance's design-system thesis.

## Sources

- TypeSafe docs: [introduction](https://docs.typesafe.ai/introduction), [choice](https://docs.typesafe.ai/primitives/choice.md), [score](https://docs.typesafe.ai/primitives/score.md), [confidence](https://docs.typesafe.ai/confidence.md), [state](https://docs.typesafe.ai/concepts/state.md), [intent routing](https://docs.typesafe.ai/patterns/intent-routing.md), [confidence routing](https://docs.typesafe.ai/patterns/confidence-routing.md), [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)
- Vercel: [changelog: Jev on AI Gateway](https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway), [KB: Jev + AI SDK](https://vercel.com/kb/guide/typesafe-jev-and-ai-sdk), [form-router guide](https://vercel.com/kb/guide/jev-ai-sdk-form-router), [model page](https://vercel.com/ai-gateway/models/jev), [decision modality](https://vercel.com/docs/ai-gateway/modalities/decision), [403 thread](https://community.vercel.com/t/ai-gateway-jev-request-returns-403-and-is-absent-from-logs/49653)
- AI SDK: `node_modules/ai/docs/03-ai-sdk-core/32-decisions.mdx` (installed version, authoritative)
- json-render: [Jev guide](https://json-render.dev/docs/jev), [azukiazusa walkthrough](https://azukiazusa.dev/blog/json-render-jev)
- Third-party: [developersdigest guide](https://www.developersdigest.tech/blog/how-to-use-jev-typesafe-guide-2026), [flaviocopes](https://flaviocopes.com/jev-vercel-ai-sdk/), [LiteLLM benchmark](https://docs.litellm.ai/blog/jev-auto-router-benchmark), [jev-certify](https://github.com/nikkoxgonzales/jev-certify)
