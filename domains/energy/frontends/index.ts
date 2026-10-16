import { ClarifyFrontEnd } from "@/components/frontends/clarify";
import { GeneralFrontEnd } from "@/components/frontends/general";
import type { FrontEndRegistry } from "@/components/frontends/types";
import { BillFrontEnd } from "./bill";
import { MoveFrontEnd } from "./move";
import { OutageFrontEnd } from "./outage";
import { QuoteFrontEnd } from "./quote";
import { SupportFrontEnd } from "./support";

// Every front end Acme Energy's decisions can route to. Each is a whole page body built only
// from HeroUI v3 components.
export const ENERGY_FRONT_ENDS: FrontEndRegistry = {
  outage: { name: "Outage", Component: OutageFrontEnd },
  bill: { name: "Bill explainer", Component: BillFrontEnd },
  move: { name: "Moving home", Component: MoveFrontEnd },
  quote: { name: "Quote & compare", Component: QuoteFrontEnd },
  support: { name: "Payment support", Component: SupportFrontEnd },
  general: { name: "General help", Component: GeneralFrontEnd },
  clarify: { name: "Clarify", Component: ClarifyFrontEnd },
};
