import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react";
import type { DoorUI, FrameProps } from "@/components/front-door";
import { pickableNeeds, type Domain } from "@/lib/domain";
import { energy } from "./domain";

// Acme Energy's site chrome: a supplier's help centre, stock HeroUI v3.

const NAV = [
  { label: "Tariffs", need: "switching" },
  { label: "Moving home", need: "moving_home" },
  { label: "Payments", need: "payment_support" },
] as const;

function topicHref(domain: Domain, id: string) {
  return { pathname: domain.path, query: { q: domain.needs[id].label, need: id } };
}

function SiteHeader() {
  return (
    <header className="border-b border-separator bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/energy" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-sm text-accent-foreground">
            A
          </span>
          Acme Energy
        </Link>
        <nav aria-label="Main" className="hidden gap-5 text-sm text-muted md:flex">
          {NAV.map((n) => (
            <Link key={n.label} href={topicHref(energy, n.need)} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <Link href="/energy" className="font-medium text-foreground">
            Help
          </Link>
        </nav>
        <span className="ml-auto flex gap-2">
          <span className={buttonVariants({ variant: "tertiary", size: "sm" })}>Log in</span>
        </span>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-separator">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted">
        <span>© Acme Energy</span>
        <span>Acme Energy is a fictional company made for a demo.</span>
      </div>
    </footer>
  );
}

function Emergency() {
  return (
    <div className="grid gap-1 rounded-2xl bg-surface-secondary p-4 text-sm sm:flex sm:items-center sm:gap-6">
      <p>
        <span className="font-semibold">Power cut?</span> Call 105, free, day or night.
      </p>
      <p>
        <span className="font-semibold">Smell gas?</span> Leave the building and call 0800 111 999.
      </p>
    </div>
  );
}

function EnergyFrame({ needBar, screen, message }: FrameProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader />
      {message ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{screen}</main>
      ) : (
        <main className="grid">
          <section className="bg-accent-soft">
            <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-14 sm:py-20">
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">How can we help?</h1>
              <p className="max-w-xl text-lg text-muted">Search our help, or tell us what&apos;s going on in your own words.</p>
              <div className="max-w-2xl">{needBar}</div>
            </div>
          </section>
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10">{screen}</div>
        </main>
      )}
      <SiteFooter />
    </div>
  );
}

function EnergyWelcome({ domain }: { domain: Domain }) {
  return (
    <>
      <Emergency />
      <section aria-labelledby="topics" className="grid gap-4">
        <h2 id="topics" className="text-xl font-semibold tracking-tight">
          Popular topics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pickableNeeds(domain).map((id) => (
            <Link key={id} href={topicHref(domain, id)} className="group rounded-3xl focus-visible:outline-2 focus-visible:outline-focus">
              <Card className="h-full transition group-hover:shadow-md">
                <Card.Header>
                  <Card.Title>{domain.needs[id].label}</Card.Title>
                  <Card.Description>{domain.needs[id].hint}</Card.Description>
                </Card.Header>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export const ENERGY_UI: DoorUI = { Frame: EnergyFrame, Welcome: EnergyWelcome };
