"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alert, Skeleton } from "@heroui/react";
import { DevNotes } from "@/components/dev-notes";
import { DevPanel } from "@/components/dev-panel";
import { XRay } from "@/components/xray";
import { BANK_DOOR } from "@/domains/bank/client";
import { ENERGY_DOOR } from "@/domains/energy/client";
import type { Domain } from "@/lib/domain";
import type { DecideResponse, LimitReason } from "@/lib/limits/decide";
import { fallbackRoute } from "@/lib/route";

const DOORS = { energy: ENERGY_DOOR, bank: BANK_DOOR };

/** What the developer drawer says when a search got the fallback page. Visitors never see this. */
const LIMIT_NOTES: Record<LimitReason | "offline", { title: string; body: string }> = {
  disabled: { title: "Jev is switched off", body: "The kill switch is on (JEV_ENABLED), or the cookie secret is missing on Vercel." },
  bot: { title: "BotID flagged this request", body: "No Jev call was made." },
  quota: { title: "This visitor's daily limit is used up", body: "Back at midnight UTC (JEV_VISITOR_DAILY_LIMIT)." },
  network: { title: "This network's daily limit is used up", body: "Too many new devices, or its share of the budget. Back at midnight UTC." },
  resting: { title: "Today's budget is spent", body: "Decisions rest until midnight UTC (JEV_DAILY_BUDGET_USD)." },
  busy: { title: "Decisions in flight fill a cap", body: "A moment's wait; nothing is used up." },
  unavailable: { title: "Jev or the quota store didn't answer", body: "Failed closed: no decision, the general page instead." },
  offline: { title: "The decision request failed", body: "The browser couldn't reach /api/decide." },
};

type State = { phase: "loading" } | { phase: "done"; res: DecideResponse | { status: "offline" } };

/**
 * Asks /api/decide (BotID, quotas and the spend breaker live there) which screen to show, then shows
 * it inside the domain's result chrome. While it waits: the loading state. Any refusal: the person's
 * pick if they made one, else the general page, and the reason goes to the developer drawer.
 */
export function Decision({ domainId, q, need, needBar }: { domainId: Domain["id"]; q: string; need?: string; needBar: ReactNode }) {
  const door = DOORS[domainId];
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain: domainId, q, need }),
      signal: ctrl.signal,
    })
      .then((r) => r.json() as Promise<DecideResponse>)
      .then((res) => setState({ phase: "done", res }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ phase: "done", res: { status: "offline" } });
      });
    return () => ctrl.abort();
  }, [domainId, q, need]);

  if (state.phase === "loading") {
    return (
      <>
        <door.Result needBar={needBar}>
          <door.Reading />
        </door.Result>
        <DevPanel>
          <DevNotes domain={door.domain}>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </DevNotes>
        </DevPanel>
      </>
    );
  }

  const { res } = state;
  const route = res.status === "ok" || res.status === "limited" ? res.route : fallbackRoute(door.domain, need);
  const { name, Component } = door.registry[route.frontEnd];
  const note = res.status === "ok" ? null : LIMIT_NOTES[res.status === "limited" ? res.reason : "offline"];
  return (
    <>
      <door.Result title={name} needBar={needBar}>
        <div className="grid gap-4">
          {route.care && <door.CareBanner domain={door.domain} />}
          <Component message={q} route={route} domain={door.domain} />
        </div>
      </door.Result>
      <DevPanel>
        <DevNotes domain={door.domain}>
          {res.status === "ok" ? (
            <XRay domain={door.domain} decision={res.decision} route={route} frontEndName={name} />
          ) : (
            note && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{note.title}</Alert.Title>
                  <Alert.Description>{note.body} Serving the fallback screen.</Alert.Description>
                </Alert.Content>
              </Alert>
            )
          )}
        </DevNotes>
      </DevPanel>
    </>
  );
}
