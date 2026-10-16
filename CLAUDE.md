@AGENTS.md

## This repo

- Jev is called only from `lib/jev.ts` with `experimental_decide` (AI SDK 7 renamed it from
  `experimental_evaluate` in 7.0.128; web guides still use the old name). Read
  `node_modules/ai/docs/03-ai-sdk-core/32-decisions.mdx` before changing the call.
- Only `POST /api/decide` may call Jev (it carries BotID, the quota, the $2/day breaker and the kill switch;
  see docs/SECURITY.md). Never call `classifyNeed` from a page or server component: that would bypass the limits.
- Jev decides, code acts: thresholds and rules live in `lib/route.ts` (unit-tested); tune them with
  `pnpm eval energy` and `pnpm eval bank`. A threshold change must hold on both domains.
- Each front door is a domain (`domains/<id>/domain.ts` + its front ends); the engine (`lib/`, `components/`)
  never names a domain. Option `examples` must not appear in that domain's eval messages (tested).
- Both apps must look like real consumer apps. Jev's workings (decision panel, presets, dev links) only ever
  appear in the developer drawer (`components/dev-panel.tsx`), never in app UI or copy.
- Energy is stock HeroUI v3. The bank uses its own kit (`domains/bank/ui`), a close UI study of Monzo's app;
  `.bank-theme` holds its tokens and also re-themes the HeroUI decision panel. HeroUI's derived tokens (hover,
  soft, field) are computed at `:root`, so a scoped theme must restate them.
- The bank is fictional: never use a real bank's name, logo, fonts or brand assets (public URL); keep the
  "not affiliated" line on the page.
- Turbopack's build cache can serve stale CSS after edits to `app/globals.css`: `rm -rf .next` before trusting a build.
- pnpm (v11) applies a one-day `minimumReleaseAge`: pinning a newer version adds `minimumReleaseAgeExclude`
  entries and the next install rejects the lockfile. Pin versions at least a day old.
