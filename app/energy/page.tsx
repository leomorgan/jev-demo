import type { Metadata } from "next";
import { FrontDoorPage } from "@/components/front-door";
import { energy } from "@/domains/energy/domain";
import { ENERGY_UI } from "@/domains/energy/ui";

export const metadata: Metadata = { title: "Help · Acme Energy" };

export default function EnergyPage({ searchParams }: PageProps<"/energy">) {
  return <FrontDoorPage domain={energy} searchParams={searchParams} ui={ENERGY_UI} />;
}
