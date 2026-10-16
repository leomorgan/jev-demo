import type { ComponentType, ReactNode } from "react";
import type { FrontEndRegistry } from "@/components/frontends/types";
import type { Domain } from "@/lib/domain";

/**
 * What the browser needs to show a decision for one domain: its screens and the chrome around a
 * result. Lives in each domain's client module (`domains/<id>/client.tsx`).
 */
export type ClientDoor = {
  domain: Domain;
  registry: FrontEndRegistry;
  /** Wraps a result: `title` is the screen's name once decided; `needBar` is the server-rendered search. */
  Result: ComponentType<{ title?: string; needBar: ReactNode; children: ReactNode }>;
  Reading: ComponentType;
  CareBanner: ComponentType<{ domain: Domain }>;
};
