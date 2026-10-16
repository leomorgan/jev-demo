import type { FrontEndRegistry } from "@/components/frontends/types";
import { CardFrontEnd } from "./card";
import { DisputeFrontEnd } from "./dispute";
import { FraudFrontEnd } from "./fraud";
import { PotsFrontEnd } from "./pots";
import { MoneySupportFrontEnd } from "./support";
import { ClarifyFrontEnd, GeneralFrontEnd } from "./topics";

// Every screen Acme Bank's decisions can route to, built with the bank's own app kit.
// The name is the screen's title in the app.
export const BANK_FRONT_ENDS: FrontEndRegistry = {
  card: { name: "Card", Component: CardFrontEnd },
  fraud: { name: "Report fraud", Component: FraudFrontEnd },
  dispute: { name: "Payment problem", Component: DisputeFrontEnd },
  support: { name: "Money worries", Component: MoneySupportFrontEnd },
  pots: { name: "New pot", Component: PotsFrontEnd },
  general: { name: "Help", Component: GeneralFrontEnd },
  clarify: { name: "Help", Component: ClarifyFrontEnd },
};
