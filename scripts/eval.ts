// Run the labelled set through live Jev and report accuracy, confidence and latency,
// so thresholds in lib/route.ts are tuned on data, not vibes. Run: pnpm eval [energy|bank]
// Calls run one at a time, so latency is per visitor, not under a burst.
import { readFileSync } from "node:fs";
import { classifyNeed } from "../lib/jev";
import { pickFrontEnd } from "../lib/route";
import { domainArg } from "./domains";

const domain = domainArg(process.argv[2]);
type Case = { message: string; need: string; urgent?: boolean; care?: boolean };
const cases: Case[] = JSON.parse(readFileSync(new URL(`../evals/${domain.id}.json`, import.meta.url), "utf8"));

const rows = [];
for (const c of cases) {
  const want = c.need === "clarify" ? "clarify" : domain.needs[c.need].frontEnd;
  const message = c.message.slice(0, 60);
  try {
    const d = await classifyNeed(domain, c.message);
    const route = pickFrontEnd(domain, d);
    rows.push({
      ok:
        route.frontEnd === want &&
        (c.care === undefined || route.care === c.care) &&
        (c.urgent === undefined || route.urgent === c.urgent),
      want: want + (c.care ? "+care" : "") + (c.urgent ? "+urgent" : ""),
      got: route.frontEnd + (route.care ? "+care" : "") + (route.urgent ? "+urgent" : ""),
      jev: `${d.need} @${d.needConfidence.toFixed(2)}`,
      urgency: +d.urgency.toFixed(2),
      distress: +d.distress.toFixed(2),
      ms: d.ms,
      tokens: d.inputTokens,
      message,
    });
  } catch (error) {
    rows.push({ ok: false, want, got: "ERROR", jev: String(error).slice(0, 60), urgency: NaN, distress: NaN, ms: NaN, tokens: undefined, message });
  }
}

console.table(rows);
const ms = rows.map((r) => r.ms).filter(Number.isFinite).sort((a, b) => a - b);
const at = (p: number) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
const failed = rows.filter((r) => r.got === "ERROR").length;
console.log(
  `${domain.id}: ${rows.filter((r) => r.ok).length}/${rows.length} routed as labelled` +
    (failed ? ` · ${failed} calls failed` : "") +
    (ms.length ? ` · latency p50 ${at(0.5)} ms, p95 ${at(0.95)} ms (sequential)` : ""),
);
if (failed === rows.length) process.exitCode = 1;
