import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { Card, Chip } from "@heroui/react";
import { LeoMark } from "@leomorgan/mark";
import { bankSans } from "@/app/fonts";
import { bank } from "@/domains/bank/domain";
import { energy } from "@/domains/energy/domain";
import type { Domain } from "@/lib/domain";
import { configFromEnv } from "@/lib/limits/config";

export const metadata: Metadata = {
  title: "Jev front ends · Leo Morgan",
  description:
    "A demo by Leo Morgan: a decision model reads what you need in your own words, and the app serves a front end built for it.",
};

const HUB = "https://leomorgan.ai";

const DEMOS = [
  {
    domain: energy,
    theme: "",
    blurb: "An energy supplier's help centre: power cuts, bills that jumped, moving home, switching, and people who can't pay.",
    look: "Stock HeroUI v3",
    tries: [0, 4, 5],
  },
  {
    domain: bank,
    theme: `${bankSans.variable} bank-theme`,
    blurb: "A banking app: lost cards, scams, payments gone wrong, money worries, and saving up.",
    look: "Own kit: a UK app-bank UI study",
    tries: [0, 1, 4],
  },
] satisfies { domain: Domain; theme: string; blurb: string; look: string; tries: number[] }[];

const STEPS = [
  { title: "You say what you need", body: "There's one box and no menus." },
  {
    title: "Jev makes one decision",
    body: "One call asks three typed questions at once: which need is it, how urgent is it, and does the person sound distressed. The answers come back as probabilities in about 0.3 s.",
  },
  {
    title: "My code picks the front end",
    body: "Jev never writes UI. Small, tested rules turn its answers into a screen, switch on an urgent or a gentler mode, and ask a follow-up question when the answer is unclear.",
  },
];

const FINDINGS = [
  "Keep the model to typed answers. Jev decides and my code acts, so every route is a rule I can test.",
  "Jev's confidence sat between 0.98 and 1.00, so I gave it an explicit “unclear” answer instead of trusting a threshold.",
  "It routed all 40 of my test messages to the right screen across both companies, at roughly $0.00004 a decision.",
];

/** How many distinct screens a company's needs route to. */
function screens(domain: Domain) {
  return new Set(Object.values(domain.needs).map((n) => n.frontEnd)).size;
}

export default function StartPage() {
  const { visitorDailyLimit } = configFromEnv();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-8 sm:py-12">
      <nav aria-label="Leo Morgan" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <a href={HUB} className="font-semibold hover:underline">
          Leo Morgan
        </a>
        <a href={HUB} className="text-muted hover:underline">
          More of my work at leomorgan.ai
        </a>
      </nav>

      <header className="grid max-w-3xl gap-4">
        <Chip size="sm" variant="soft">
          Side project · October 2026
        </Chip>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Dynamic decisions building dynamic front ends</h1>
        <p className="text-lg text-pretty">
          I built this demo to explore dynamic decisions building dynamic front ends. You tell a company what you need,
          in your own words. A decision model works out what you&apos;re after, and the app serves a front end made for
          it, there and then.
        </p>
        <p className="text-pretty text-muted">
          The model is Jev, which TypeSafe AI released in September. I wanted to see it working on a real example, so I
          built two fictional companies to try it on: an energy supplier and a bank. Both are meant to look and feel like
          real consumer apps.
        </p>
      </header>

      <section aria-labelledby="try" className="grid gap-4">
        <h2 id="try" className="text-xl font-semibold tracking-tight">
          Try it
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {DEMOS.map(({ domain, theme, blurb, look, tries }) => (
            <div key={domain.id} className={`${theme} rounded-[calc(var(--radius)*2.5)]`}>
              <Card className="h-full">
                <Card.Header>
                  <div className="flex flex-wrap items-center gap-2">
                    <Card.Title className="text-xl">{domain.name}</Card.Title>
                    <Chip size="sm" color="accent" variant="soft">
                      {look}
                    </Chip>
                  </div>
                  <Card.Description>{blurb}</Card.Description>
                </Card.Header>
                <Card.Content className="grid gap-2">
                  <p className="text-sm font-medium text-muted">Try saying</p>
                  {tries.map((i) => {
                    const p = domain.presets[i];
                    return (
                      <Link
                        key={p.label}
                        href={{ pathname: domain.path, query: { q: p.q } }}
                        className={`${buttonVariants({ variant: "tertiary", fullWidth: true })} h-auto min-h-10 py-2 whitespace-normal`}
                      >
                        <span className="min-w-0 text-balance">“{p.q}”</span>
                      </Link>
                    );
                  })}
                </Card.Content>
                <Card.Footer className="flex flex-wrap gap-2">
                  <Link href={domain.path} className={buttonVariants({ variant: "primary" })}>
                    Open {domain.name}
                  </Link>
                  <Link href={`${domain.path}/frontends`} className={buttonVariants({ variant: "ghost" })}>
                    See all {screens(domain)} screens
                  </Link>
                </Card.Footer>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how" className="grid gap-4">
        <h2 id="how" className="text-xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card variant="secondary" className="h-full">
                <Card.Header>
                  <span className="font-mono text-sm text-muted">{i + 1}</span>
                  <Card.Title>{s.title}</Card.Title>
                  <Card.Description>{s.body}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          ))}
        </ol>
        <p className="max-w-3xl text-sm text-pretty text-muted">
          On every screen, the small button in the bottom corner (a dot on phones) opens the developer view: the
          probabilities Jev returned, the rules that fired, and exactly what was sent.
        </p>
      </section>

      <section aria-labelledby="found" className="grid max-w-3xl gap-4">
        <h2 id="found" className="text-xl font-semibold tracking-tight">
          What I found
        </h2>
        <ul className="grid list-disc gap-2 pl-5 text-pretty">
          {FINDINGS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <footer className="grid gap-1 text-sm text-muted">
        <p>
          Acme Energy and Acme Bank are fictional and not affiliated with any real company. To keep the demo free to run,
          each visitor gets {visitorDailyLimit} decisions a day.
        </p>
        {/* The maker's mark ends the page. It takes the text colour around it, so give it full ink, not the muted grey. */}
        <div className="mt-6 text-foreground">
          <LeoMark className="[--leomark-dot:var(--accent)]" />
        </div>
      </footer>
    </main>
  );
}
