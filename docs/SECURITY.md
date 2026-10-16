# Security & spend

Layered spend limits for the one thing here that costs money: a Jev decision.

- **Data:** nothing personal is stored. The visitor's message goes to Jev (TypeSafe, through Vercel AI
  Gateway) and is never logged.
- **Identity:** anonymous and public. Anyone with the URL can use both apps.
- **Entry points:** `POST /api/decide` (the only endpoint that spends), plus the BotID challenge proxy routes
  `withBotId` adds in `next.config.ts`. Pages never call Jev: a search renders `<Decision>`, which posts to the
  endpoint from the browser, so prefetches, crawlers and link previews can't spend anything. The endpoint
  trusts nothing from the client: the body is capped (2 KB) and validated with zod, the message is capped at
  500 characters, and the questions, model and thresholds are fixed on the server. Cross-site requests are
  refused (Origin, Sec-Fetch-Site and a JSON Content-Type are checked before the body is read).

## Abuse limits, outside in

1. **Provider backstop:** prepaid AI Gateway credits on the Vercel team with **auto top-up off** (Leo sets it).
   When they run out, Jev errors and every search falls back to the general page: it fails closed.
2. **Edge rate limit:** a Vercel Firewall rule on `/api/decide`, **20 requests per 60 s per IP** (dashboard;
   agents don't touch `vercel firewall`).
3. **Bot protection:** Vercel **BotID** on `/api/decide` (`instrumentation-client.ts` plus `checkBotId()` in the
   route), on Vercel only.
4. **Per-visitor quota:** **40 decisions per visitor per UTC day** (`JEV_VISITOR_DAILY_LIMIT`), keyed by IP plus
   a device cookie, in **Upstash Redis**. Keys are namespaced `jev:<env>:…`, per environment, using
   about 11 commands a decision. Each network (an IPv4 address or an IPv6 /48) brings
   at most 30 devices a day. The `jev_device` cookie is issued and HMAC-signed by the server
   (`JEV_COOKIE_SECRET`); an unsigned or forged cookie is a new device. Shares are strict: one visitor at most a
   quarter of the day's budget, one network a third.
5. **Global daily budget breaker:** each decision reserves its worst case up front (two attempts × (1,200 fixed
   tokens + one token per byte of message) × $0.042/M ≈ $0.0001) in one atomic Redis script, then settles at
   what Jev reported (about 950 tokens ≈ $0.00004). Over **`JEV_DAILY_BUDGET_USD=2`** per environment,
   decisions rest until midnight UTC. Fails closed if Redis is unreachable. A call the provider turned down
   (an HTTP error) is unbilled and given back; a timeout keeps its worst case charged.
6. **Per-request caps:** message and body caps above, a 5 s timeout, one retry, and the **`JEV_ENABLED`** kill switch.
7. **Monitoring:** one `jev_decision` JSON line per request in Vercel's runtime logs (outcome, need, route,
   timing, tokens, charged and spent micro-dollars, the visitor's count today; never the message).

Every "no" still serves a page: the visitor's pick if they made one, else the general help page. Only the
developer drawer says why.

- **Secrets** (server-only): `JEV_COOKIE_SECRET` (random, 32+ bytes, all three Vercel envs) and the Upstash
  REST credentials the Marketplace injects (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). AI Gateway auth is the
  project's OIDC token. Without the cookie secret or the store on Vercel, decisions rest (fail closed).
- **Third parties:** TypeSafe (via AI Gateway) receives the message. Upstash holds a **hashed visitor key** (sha256
  of IP + device id) and a **coarse network bucket** (20 bits of a hash), both expiring after 2 days. BotID
  receives browser challenge signals through same-origin proxy routes.
- **Cookies:** one HttpOnly `jev_device` cookie (a random id, 1 year, sent only to `/api/decide`), used only for
  abuse prevention: strictly necessary, no consent banner. No analytics cookies.
- **Environments:** Redis keys are namespaced by `VERCEL_ENV`, so local and preview runs never count against
  production. Each environment has its own $2 breaker.
- **Not verified in the repo:** the Firewall rule and the Gateway top-up setting live in dashboards; check them
  before going public and at each ship.
