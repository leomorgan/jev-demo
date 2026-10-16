# jev-demo: one front door, many front ends

A visitor types what they need. [Jev](https://docs.typesafe.ai/introduction), TypeSafe AI's decision
model, classifies it at runtime in one call (which need, how urgent, any distress), and plain code picks
which React front end to serve.

Two fictional consumer apps share one engine:

| Route | App | Built with |
|---|---|---|
| `/` | Start page: pick a demo | Stock HeroUI v3 |
| `/energy` | **Acme Energy**: a supplier's help centre (power cuts, bills, moving, switching, can't pay) | Stock HeroUI v3 |
| `/bank` | **Acme Bank**: a mobile banking app's Help tab (lost cards, scams, payment problems, money worries, saving) | Its own app kit (`domains/bank/ui`): a close UI study of Monzo's app |
| `/energy/frontends`, `/bank/frontends` | Developer pages: every screen each app can serve | |

**The apps look like real consumer apps; Jev stays out of sight.** The decision panel (probabilities,
confidence, rules that fired, timing, cost), demo phrases and developer links live in a drawer toggled by
the floating "Show how Jev decided" control. It is off by default and remembered per browser.

The bank is fictional: no real bank's name, logo, fonts or brand assets, and it says so on the page.
Colours and patterns were measured from Monzo's public site and app-store screenshots.

- **What and why:** [docs/DEMO.md](docs/DEMO.md): the demo brief, architecture and a script for both demos
- **How Jev works, setup gotchas, options:** [docs/RESEARCH.md](docs/RESEARCH.md)

Stack: Next.js 16 (App Router, Cache Components) · React 19 · Tailwind v4 · HeroUI v3 · AI SDK 7
(`experimental_decide`) · Vercel AI Gateway (`typesafe-ai/jev`).

## Run it

```bash
pnpm install
vercel link            # once: links the Vercel project (Jev runs through its AI Gateway)
vercel env pull .env.local   # writes VERCEL_OIDC_TOKEN (expires after 12 h, re-run on 401)
pnpm smoke bank        # one live Jev call; prints the decision and route
pnpm dev               # http://localhost:3000
```

Or put `AI_GATEWAY_API_KEY=…` in `.env.local` instead of the OIDC token.

**Jev needs paid AI Gateway credits on the Vercel team.** Two 403s come first, and the app falls back to the
general page while either applies:

1. No card on file: `customer_verification_required` ("AI Gateway requires a valid credit card on file…").
2. Card on file but only free credits: `RestrictedModelsError` ("Free tier users do not have access to this
   model"). Jev isn't in the free tier, so top up paid credits in the team's AI Gateway settings.

## Scripts

| | |
|---|---|
| `pnpm smoke [energy\|bank] ["message"]` | One live decision (default: the domain's first preset) |
| `pnpm eval [energy\|bank]` | Runs `evals/<domain>.json` (22 energy / 18 bank labelled messages) through live Jev: accuracy, confidence, latency |
| `pnpm test` | Routing rules, answer parsing and domain checks, using the AI SDK's mock decision model (no network) |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | |

## Add a front door

1. `domains/<id>/domain.ts`: the needs (each with Jev's criteria and a front-end id, plus `other` and
   `unclear`), presets and care copy. Keep option `examples` different from every eval message (a test enforces it).
2. `domains/<id>/frontends/`: one component per screen and a registry (`general` and `clarify` are required).
3. `domains/<id>/ui.tsx`: a `DoorUI` (at least a `Frame`; search, welcome, loading and care banner are optional
   and default to stock HeroUI). `app/<id>/page.tsx` renders `FrontDoorPage` with it.
4. `evals/<id>.json`, then `pnpm eval <id>` to check thresholds against live Jev.

## Deploy

Deploys go through the Vercel CLI from a committed
checkout; the project has no Git integration, so nothing deploys on push.

```bash
vercel deploy --prod   # build and ship the current checkout
vercel rollback        # roll back to the previous deployment
```

**Spend limits, layer for layer** ([docs/SECURITY.md](docs/SECURITY.md)). The only
thing that spends is `POST /api/decide`, which the browser calls after a search; pages never call Jev.

| Layer | Where | Setting |
|---|---|---|
| Provider backstop | AI Gateway (dashboard) | prepaid credits, auto top-up **off** |
| Edge rate limit | Vercel Firewall (dashboard) | `/api/decide`, 20 requests / 60 s per IP |
| Bot protection | BotID (code) | `checkBotId()` on `/api/decide`, Vercel only |
| Per-visitor quota | Upstash Redis (code) | `JEV_VISITOR_DAILY_LIMIT=40`, 30 devices per network, signed `jev_device` cookie |
| Daily budget breaker | Upstash Redis (code) | `JEV_DAILY_BUDGET_USD=2` per environment, reserve then settle, fails closed |
| Request caps | code | 500-character message, 2 KB body, 5 s timeout, `JEV_ENABLED` kill switch |
| Monitoring | Vercel logs | one `jev_decision` line per request, never the message |

Any refusal still serves a page (the visitor's pick, else the general help page); the developer drawer says why.
Needs `JEV_COOKIE_SECRET` and the Upstash credentials (`KV_REST_API_URL`, `KV_REST_API_TOKEN`,
keys namespaced `jev:`) on Vercel; see `.env.example`.
without them decisions rest. Locally they count in memory, or in the store's `jev:development:` keys after `vercel env pull`.

- Crawlers are kept off search URLs (`app/robots.txt`) and pages are `noindex`.
- Old `/?q=` and `/frontends` links redirect to `/energy` (`next.config.ts`).

## Map

| | |
|---|---|
| `lib/domain.ts` | The `Domain` shape, shared urgency levels and distress criteria, need helpers |
| `lib/jev.ts` | The single `experimental_decide` call (3 questions, parallel) for any domain → `NeedDecision` |
| `lib/route.ts` | `pickFrontEnd()`: thresholds and rules, in code |
| `domains/energy`, `domains/bank` | Each front door's needs, presets, copy and HeroUI front ends |
| `components/front-door.tsx`, `decision.tsx` | The front door (server) and the client that asks `/api/decide` and shows the chosen screen |
| `app/api/decide`, `lib/limits/` | The only paid endpoint, and its spend limits |
| `components/dev-panel.tsx`, `dev-notes.tsx`, `xray.tsx` | The developer drawer and the decision panel inside it |
| `components/frontends/` | Stock HeroUI `general` and `clarify` screens (energy) |
| `domains/bank/ui/` | The bank's app kit: phone shell, sheets, grouped rows, amounts, pills, native-input toggles |
| `app/page.tsx` | Start page; `app/energy`, `app/bank` are the two doors (the bank's layout applies its theme) |
