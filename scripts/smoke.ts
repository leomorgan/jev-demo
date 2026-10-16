// One live Jev call through AI Gateway, using the app's own classifier.
// Run: pnpm smoke [energy|bank] ["message"]
import { classifyNeed } from "../lib/jev";
import { pickFrontEnd } from "../lib/route";
import { DOMAINS, domainArg } from "./domains";

const args = process.argv.slice(2);
const domain = domainArg(args[0] && args[0] in DOMAINS ? args.shift() : undefined);
const message = args[0] ?? domain.presets[0].q;
const decision = await classifyNeed(domain, message);
console.log(JSON.stringify({ domain: domain.id, decision, route: pickFrontEnd(domain, decision) }, null, 2));
