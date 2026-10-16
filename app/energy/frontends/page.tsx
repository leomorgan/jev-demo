import type { Metadata } from "next";
import { FrontEndCatalogue } from "@/components/frontend-catalogue";
import { energy } from "@/domains/energy/domain";
import { ENERGY_FRONT_ENDS } from "@/domains/energy/frontends";

export const metadata: Metadata = { title: "Acme Energy · front ends" };

export default function EnergyFrontEndsPage() {
  return <FrontEndCatalogue domain={energy} registry={ENERGY_FRONT_ENDS} />;
}
