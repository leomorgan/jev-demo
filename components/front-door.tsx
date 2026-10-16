import { Suspense, type ComponentType, type ReactNode } from "react";
import { Decision } from "@/components/decision";
import { DevNotes } from "@/components/dev-notes";
import { DevPanel } from "@/components/dev-panel";
import { NeedBar as HeroNeedBar } from "@/components/need-bar";
import { isNeedId, type Domain } from "@/lib/domain";

/** What a domain's frame receives: app content only. Jev's workings go to the developer drawer. */
export type FrameProps = {
  needBar: ReactNode;
  screen: ReactNode;
  /** Set once the visitor has asked something. */
  message?: string;
  /** The search params are still resolving: draw the chrome only. */
  loading?: boolean;
};

/** A domain's server-side chrome; anything it leaves out falls back to stock HeroUI. */
export type DoorUI = {
  Frame: ComponentType<FrameProps>;
  NeedBar?: ComponentType<{ domain: Domain; q?: string }>;
  Welcome?: ComponentType<{ domain: Domain }>;
};

type DoorProps = {
  domain: Domain;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  ui: DoorUI;
};

// One front door per domain. The page is static apart from the search params and never calls Jev
// itself: a search renders <Decision>, which asks the protected POST /api/decide from the browser
// (BotID, quotas, spend breaker). So prefetches, crawlers and link previews can't spend anything.
export function FrontDoorPage(props: DoorProps) {
  const { domain, ui } = props;
  const NeedBar = ui.NeedBar ?? HeroNeedBar;
  return (
    <Suspense
      fallback={
        <>
          <ui.Frame needBar={<NeedBar domain={domain} />} screen={null} loading />
          <DevPanel>
            <DevNotes domain={domain} />
          </DevPanel>
        </>
      }
    >
      <FrontDoor {...props} />
    </Suspense>
  );
}

async function FrontDoor({ domain, searchParams, ui }: DoorProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const need = isNeedId(domain, params.need) ? params.need : undefined;
  const { Frame, NeedBar = HeroNeedBar, Welcome } = ui;
  const needBar = <NeedBar domain={domain} q={q} />;

  if (!q) {
    return (
      <>
        <Frame needBar={needBar} screen={Welcome ? <Welcome domain={domain} /> : null} />
        <DevPanel>
          <DevNotes domain={domain} />
        </DevPanel>
      </>
    );
  }
  return (
    <Frame
      needBar={needBar}
      message={q}
      // keyed so every new search starts from the loading state
      screen={<Decision key={`${q}|${need}`} domainId={domain.id} q={q} need={need} needBar={needBar} />}
    />
  );
}
