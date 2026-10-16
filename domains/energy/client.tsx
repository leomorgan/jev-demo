"use client";

import type { ReactNode } from "react";
import { buttonVariants } from "@heroui/styles";
import { Breadcrumbs, Card } from "@heroui/react";
import { CareBanner } from "@/components/care-banner";
import type { ClientDoor } from "@/components/door";
import { HeroReading } from "@/components/reading";
import { energy } from "./domain";
import { ENERGY_FRONT_ENDS } from "./frontends";

function ContactCard() {
  return (
    <Card variant="secondary">
      <Card.Header>
        <Card.Title>Still need help?</Card.Title>
        <Card.Description>Our team is here 8am to 8pm, Monday to Saturday.</Card.Description>
      </Card.Header>
      <Card.Content className="grid gap-2 text-sm">
        <span className={buttonVariants({ variant: "secondary", fullWidth: true })}>Chat with us</span>
        <p className="text-center text-muted">or call 0808 157 0192</p>
      </Card.Content>
    </Card>
  );
}

/** An answer page in the help centre: breadcrumbs, the search, the screen and a contact card. */
function EnergyResult({ title, needBar, children }: { title?: string; needBar: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/energy">Help</Breadcrumbs.Item>
          <Breadcrumbs.Item>{title ?? "Searching"}</Breadcrumbs.Item>
        </Breadcrumbs>
        <div className="max-w-2xl">{needBar}</div>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-label={title ?? "Results"}>{children}</section>
        <aside className="grid gap-4">
          <ContactCard />
        </aside>
      </div>
    </div>
  );
}

export const ENERGY_DOOR: ClientDoor = {
  domain: energy,
  registry: ENERGY_FRONT_ENDS,
  Result: EnergyResult,
  Reading: HeroReading,
  CareBanner,
};
