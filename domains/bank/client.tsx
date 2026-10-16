"use client";

import type { ReactNode } from "react";
import type { ClientDoor } from "@/components/door";
import type { Domain } from "@/lib/domain";
import { bank } from "./domain";
import { BANK_FRONT_ENDS } from "./frontends";
import * as I from "./ui/icons";
import { Banner, Pill, Sheet, Skeleton } from "./ui/kit";

/** A result opens as a pushed screen in the app. */
function BankResult({ title, children }: { title?: string; needBar: ReactNode; children: ReactNode }) {
  return <Sheet title={title ?? "Help"}>{children}</Sheet>;
}

function BankReading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
      <Skeleton className="h-28" />
    </div>
  );
}

function BankCareBanner({ domain }: { domain: Domain }) {
  return (
    <Banner tone="blue" icon={<I.Heart width={22} height={22} />} title={domain.care.title}>
      <p>{domain.care.text}</p>
      <div className="mt-3">
        <Pill icon={<I.Chat width={16} height={16} />}>Chat with us</Pill>
      </div>
    </Banner>
  );
}

export const BANK_DOOR: ClientDoor = {
  domain: bank,
  registry: BANK_FRONT_ENDS,
  Result: BankResult,
  Reading: BankReading,
  CareBanner: BankCareBanner,
};
