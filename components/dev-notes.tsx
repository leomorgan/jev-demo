import Link from "next/link";
import type { ReactNode } from "react";
import type { Domain } from "@/lib/domain";

// What the developer panel shows: the live decision (or a hint), demo phrases and the dev pages.
export function DevNotes({ domain, children }: { domain: Domain; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 text-sm">
      <header className="grid gap-1">
        <p className="font-mono text-xs tracking-wide text-neutral-500 uppercase">Developer view · {domain.name}</p>
        <p className="text-neutral-600">
          Jev (TypeSafe&apos;s decision model) reads what the visitor typed and answers three typed questions in one call.
          Plain code then picks the screen. Visitors never see this panel.
        </p>
      </header>

      {children ?? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-3 text-neutral-500">
          Ask something in the app and Jev&apos;s decision appears here.
        </p>
      )}

      <section className="grid gap-2">
        <h2 className="font-semibold">Try saying</h2>
        <ul className="grid gap-1.5">
          {domain.presets.map((p) => (
            <li key={p.label}>
              <Link
                href={{ pathname: domain.path, query: { q: p.q } }}
                className="block rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-neutral-200 hover:ring-neutral-400"
              >
                <span className="font-medium">{p.label}</span>
                <span className="block text-neutral-500">“{p.q}”</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-600" aria-label="Developer pages">
        <Link href={`${domain.path}/frontends`} className="underline underline-offset-2">
          Every screen
        </Link>
        <Link href="/" className="underline underline-offset-2">
          Both demos
        </Link>
      </nav>
    </div>
  );
}
