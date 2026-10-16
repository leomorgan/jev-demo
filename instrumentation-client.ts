import { initBotId } from "botid/client/core";

// Vercel BotID on the decision endpoint. The browser solves an invisible challenge and
// sends its proof with each decision request; `/api/decide` checks it with `checkBotId()`.
if (process.env.JEV_BOTID === "on") {
  initBotId({ protect: [{ path: "/api/decide", method: "POST" }] });
}
