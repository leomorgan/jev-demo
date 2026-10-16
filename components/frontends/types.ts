import type { ComponentType } from "react";
import type { Domain } from "@/lib/domain";
import type { Route } from "@/lib/route";

export interface FrontEndProps {
  message: string;
  route: Route;
  domain: Domain;
}

/** Every front end a domain's decisions can route to. Each is a whole page body built only from HeroUI v3. */
export type FrontEndRegistry = Record<string, { name: string; Component: ComponentType<FrontEndProps> }>;
