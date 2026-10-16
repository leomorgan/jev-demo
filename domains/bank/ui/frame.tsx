import Form from "next/form";
import type { ReactNode } from "react";
import type { DoorUI, FrameProps } from "@/components/front-door";
import { pickableNeeds, type Domain } from "@/lib/domain";
import { MAX_MESSAGE_CHARS } from "@/lib/jev";
import { ContactRows, TopicRows } from "../frontends/topics";
import * as I from "./icons";
import { GroupLabel, Phone, RoundButton } from "./kit";

// Acme Bank: the app's Help tab is the front door. Results open as pushed screens.

function BankSearch({ domain, q }: { domain: Domain; q?: string }) {
  return (
    <Form key={q} action={domain.path} role="search" className="flex h-12 items-center gap-2 rounded-[16px] bg-white px-3.5">
      <I.Search width={20} height={20} className="shrink-0 text-[var(--mz-grey)]" />
      <input
        name="q"
        defaultValue={q}
        aria-label="Search help"
        maxLength={MAX_MESSAGE_CHARS}
        placeholder="Search or ask a question"
        className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-[#8b969c]"
      />
    </Form>
  );
}

function HelpHome({ needBar, children }: { needBar: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-[32px] leading-none font-extrabold tracking-tight">Help</h1>
        <RoundButton label="Chat with us">
          <I.Chat width={20} height={20} />
        </RoundButton>
      </div>
      {needBar}
      {children}
    </div>
  );
}

function BankFrame({ needBar, screen, message, loading }: FrameProps) {
  return (
    <div className="min-h-dvh bg-[var(--mz-app)] sm:flex sm:flex-col sm:items-center sm:justify-center sm:gap-5 sm:bg-[var(--mz-navy)] sm:py-10">
      <Phone>
        {loading ? null : message ? (
          screen
        ) : (
          <HelpHome needBar={needBar}>{screen}</HelpHome>
        )}
      </Phone>
      <p className="hidden text-center text-[12px] text-white/45 sm:block">
        Acme Bank is fictional: a UI study, not affiliated with any bank.
      </p>
    </div>
  );
}

function BankWelcome({ domain }: { domain: Domain }) {
  return (
    <>
      <GroupLabel>Get help with</GroupLabel>
      <TopicRows domain={domain} ids={pickableNeeds(domain)} />
      <GroupLabel>Get in touch</GroupLabel>
      <ContactRows />
    </>
  );
}

export const BANK_UI: DoorUI = { Frame: BankFrame, NeedBar: BankSearch, Welcome: BankWelcome };
