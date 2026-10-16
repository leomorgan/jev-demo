import { checkBotId } from "botid/server"
import { after } from "next/server"
import { classifyNeed } from "@/lib/jev"
import { configFromEnv } from "@/lib/limits/config"
import { handleDecide } from "@/lib/limits/decide"
import { deviceSignerFromEnv } from "@/lib/limits/device"
import { limitStoreFromEnv } from "@/lib/limits/limits"

// The one endpoint that spends money: a Jev decision. Everything it does is in lib/limits/decide.ts;
// this file wires the real services in: Jev through AI Gateway, Upstash Redis for the spend caps,
// BotID, and the device cookie's signing secret (server-only).

export async function POST(request: Request): Promise<Response> {
  return handleDecide(request, {
    config: configFromEnv(),
    limits: limitStoreFromEnv(),
    devices: deviceSignerFromEnv(),
    isBot: async () => (await checkBotId()).isBot,
    decide: (domain, message, signal) => classifyNeed(domain, message, { signal }),
    log: (line) => console.info(JSON.stringify(line)),
    now: () => Date.now(),
    // settling the spend and the usage line run after the response, and Vercel waits for them
    defer: (task) => after(task),
  })
}
