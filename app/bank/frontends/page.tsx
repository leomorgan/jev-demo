import type { Metadata } from "next";
import Link from "next/link";
import { bank } from "@/domains/bank/domain";
import { BANK_FRONT_ENDS } from "@/domains/bank/frontends";
import { Phone, Sheet } from "@/domains/bank/ui/kit";
import { needIds, pickableNeeds, type Domain } from "@/lib/domain";
import type { Route } from "@/lib/route";

export const metadata: Metadata = { title: "Every screen · Acme Bank" };

// Developer page: every screen Jev's decision can open, side by side.
export default function BankFrontEndsPage() {
  const route = (frontEnd: string): Route => ({
    frontEnd,
    care: false,
    urgent: false,
    alternatives: pickableNeeds(bank),
    rule: [],
  });
  return (
    <main className="min-h-dvh bg-[var(--mz-navy)] px-4 py-10 text-white">
      <header className="mx-auto grid max-w-6xl gap-1">
        <Link href="/bank" className="text-sm text-white/60 hover:text-white">
          ← Acme Bank
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Every screen</h1>
        <p className="text-white/60">What Jev&apos;s decision can open, one per need.</p>
      </header>
      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap justify-center gap-8">
        {Object.entries(BANK_FRONT_ENDS).map(([id, { name, Component }]) => {
          const needs = needIds(bank).filter((n) => (bank as Domain).needs[n].frontEnd === id);
          return (
            <figure key={id} id={id} className="grid justify-items-center gap-3 text-[var(--mz-ink)]">
              <Phone framed="always">
                <Sheet title={name}>
                  <Component message="I need some help with my account" route={route(id)} domain={bank} />
                </Sheet>
              </Phone>
              <figcaption className="font-mono text-xs text-white/60">
                {id} · {needs.map((n) => `need = ${n}`).join(", ") || "general"}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </main>
  );
}
