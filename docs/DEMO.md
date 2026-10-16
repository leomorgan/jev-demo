# Demo brief: one front door, many front ends

## The point in one line

A visitor types what they need in their own words. **Jev classifies the need in one call (~0.3 s measured),
plain code picks which React front end to serve, and every front end is built from the same HeroUI
system.** Nobody navigates menus, and no LLM writes UI at runtime.

## Story: two fictional front doors, one engine

- **Acme Energy** (`/energy`, stock HeroUI): the same front door gets a power cut, a bill that doubled, a
  house move, someone shopping around, someone who can't pay. Each deserves a different page.
- **Acme Bank** (`/bank`, its own app kit: a close UI study of Monzo's app): a lost card, a scam call, a
  purchase gone wrong, money worries, saving up. The Help tab is the front door; answers open as app screens.

The start page (`/`) offers both. Same classifier and router; each app brings its own screens and chrome.
Both look like real consumer apps: Jev's workings live in a developer drawer, off by default.

## How it works

```
 visitor text ──► Server Component (/?q=…)
                     │  await connection()
                     ▼
              experimental_decide("typesafe-ai/jev")      one call, 3 questions in parallel
              state:     { message }
              questions: need      choice  (7 options: outage, bill_shock, moving_home,
                                           switching, payment_support, other, unclear)
                         urgency   score   (exploring → days → right now)
                         distress  boolean (P(true))
                     │
                     ▼
              pickFrontEnd(decision)                       plain code, unit-tested
                need = unclear     → Clarify  (one-tap "which is closest?", likeliest first)
                confidence < 0.5   → Clarify  (safety net for models with low or no confidence)
                need               → Outage | Bill | Move | Quote | Support | General
                distress ≥ 0.7     → care mode   (talk-to-a-person banner, no sales nudges)
                urgency ≥ 1.6      → urgent mode (the immediate action goes first)
                     │
                     ▼
              <FrontEnd/> streamed into the app's frame (Suspense)  ·  decision panel in the developer drawer
```

- **The decision runs on the server, at request time.** The page shell is prerendered and the chosen front end
  streams into it. Every decision has a shareable URL (`/?q=…`).
- **Jev decides, code acts.** Thresholds live in `lib/route.ts`, not in a prompt, and are tuned against
  `evals/needs.json`.
- **Ask, don't guess, with an explicit option.** Live, Jev's confidence sat at 0.98–1.00 on every message, vague
  ones included, so a confidence threshold alone never asks. "Too vague to tell" is therefore its own option
  (`unclear`), which Jev picks reliably. The confidence gate stays as a safety net for other models.
- **The person's tap wins.** On the Clarify page the tap overrides the model (`&need=…`), while care and urgency
  still apply. The tap re-runs Jev on the same message for those two signals (a second ~$0.00004 call); if Jev
  is down, the picked page is served anyway.
- **Jev is an accelerator, never a dependency.** On error or timeout (5 s) the general page is served.
- **Two real-looking apps.** Energy's seven screens are stock HeroUI v3; the bank's seven are its own app kit.
  `/energy/frontends` and `/bank/frontends` show every screen.
- **Jev out of sight.** The decision panel, demo phrases and developer links sit in a drawer behind the floating
  "Show how Jev decided" control: off by default, remembered per browser, never part of the app UI.

## Demo script (~5 minutes)

| # | Do | Point out |
|---|---|---|
| 1 | Open `/` | "Two fictional companies, one engine, one component system. The bank card is the same HeroUI Card, re-themed." |
| 2 | Acme Energy → **Show how Jev decided** → **Lights out** | Outage page, *urgent* mode puts "Call 105" first. The drawer shows urgency 2.00, ~300 ms, ~$0.00004 |
| 3 | **Bill doubled** | Bill explainer. Distress 0.16: annoyance isn't distress, so no care banner |
| 4 | **Can't pay** | Support page plus *care* banner (distress 0.98). Same request shape, a completely different tone |
| 5 | **Vague** | Jev picks "unclear" → Clarify. "It says when it can't tell, so the page asks." Tap one: page served |
| 6 | **Both demos** → Acme Bank → **Card gone** | Same engine, different brand: freeze switch, card, latest payments in an app frame |
| 7 | **Scam call** | Scam help, *urgent* (urgency 2.00): "Stop. Don't send any more money", tick the payments that weren't you |
| 8 | Type your own: "Not lost, my card's right here, but I don't recognise a payment to XYZ LTD" | Fraud, not lost card: negation handled in the eval, though it's a documented Jev weak spot |
| 9 | **Money tight** | Money worries plus the bank's own care banner (distress 0.91) |
| 10 | Open `/bank/frontends` | Every bank screen side by side, each in its own phone |
| 11 | Hide the drawer | The app on its own: nothing on screen says "AI" or "Jev". That's the point |

## What to say about cost and speed

- Measured: about **900 input tokens per decision ≈ $0.000038**, about $38 per million visitors. Output tokens are free.
- Measured from London, one call at a time: **p50 313 ms, p95 459 ms** (22 calls). The shell shows instantly and
  only the body waits.
- Compared with an LLM doing the same job: LiteLLM measured Jev about 5× faster than Haiku (p50 127 ms vs
  688 ms) and about 26× cheaper per classification. Against the cheapest LLMs the cost gap is single digits.
  The bigger win is probabilities and confidence instead of a parsed sentence.

## Success criteria for the demo

- [x] `pnpm eval energy`: 22/22 labelled messages routed as expected, p95 459 ms from London (target ≥ 20/22, p95 < 1 s).
  Small set; the criteria examples are kept distinct from the eval messages so it isn't marking its own homework
- [x] `pnpm eval bank`: 18/18 on the first live run, p50 324 ms (the first, cold call took 838 ms)
- [ ] Every preset lands on its intended front end live
- [ ] The drawer's numbers match the Gateway log for the same request

## Next steps (not built)

1. **Composition (json-render + Jev):** write a HeroUI catalog/registry for `@json-render/react`, then let Jev
   arrange candidate HeroUI blocks per visitor instead of picking a whole page. See RESEARCH.md §"Where it fits".
2. **Richer state:** add non-text signals (account status, open outage in the postcode, device, time of day)
   as JSON next to the message. This is still one call.
3. **Gateway decision fallback:** below `confidenceBelow: 0.6`, re-ask another model before falling back to Clarify
   (a language-model fallback returns no confidence, which our code treats as 0, so it would still ask).
4. **Measure:** log decision + route + outcome (task completed, clarify tapped) to calibrate thresholds on real traffic.
5. **Grow the eval:** 22 messages is enough to catch regressions, not to claim accuracy. Add real phrasing as it arrives.
