import Link from "next/link";
import { Chip } from "@heroui/react";
import type { FrontEndRegistry } from "@/components/frontends/types";
import { needIds, pickableNeeds, type Domain } from "@/lib/domain";
import { CLARIFY_BELOW, type Route } from "@/lib/route";

// The catalogue a domain's decisions route into: every front end, rendered with a neutral route.
export function FrontEndCatalogue({ domain, registry, frame }: { domain: Domain; registry: FrontEndRegistry; frame?: "phone" }) {
  const route = (frontEnd: string): Route => ({
    frontEnd,
    care: false,
    urgent: false,
    alternatives: pickableNeeds(domain),
    rule: [],
  });
  return (
    <main className={`mx-auto grid w-full gap-10 px-4 py-6 sm:py-10 ${frame === "phone" ? "max-w-md" : "max-w-3xl"}`}>
      <header className="grid gap-1">
        <Link href={domain.path} className="text-sm text-muted">
          ← {domain.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">The front ends</h1>
        <p className="text-muted">
          {Object.keys(registry).length} page bodies, all HeroUI v3. Jev&apos;s answers pick one per visitor.
        </p>
      </header>
      {Object.entries(registry).map(([id, { name, Component }]) => {
        const needs = needIds(domain).filter((n) => domain.needs[n].frontEnd === id);
        return (
          <section key={id} className="grid gap-3" id={id}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{name}</h2>
              {needs.map((n) => (
                <Chip key={n} size="sm" variant="soft">
                  need = {n}
                </Chip>
              ))}
              {id === "clarify" && (
                <Chip size="sm" variant="soft">
                  or confidence &lt; {CLARIFY_BELOW}
                </Chip>
              )}
            </div>
            <Component message="I need some help with my account" route={route(id)} domain={domain} />
          </section>
        );
      })}
    </main>
  );
}
