import type { FrontEndProps } from "@/components/frontends/types";
import * as I from "../ui/icons";
import { Banner, Group, GroupLabel, Row, ToggleRow } from "../ui/kit";
import { RECENT } from "./data";
import { TxnRow } from "./txn-row";

const ACTIONS = [
  { label: "Freeze", Icon: I.Snowflake },
  { label: "Show PIN", Icon: I.Eye },
  { label: "Details", Icon: I.CardIcon },
  { label: "Replace", Icon: I.Refresh },
];

export function CardFrontEnd({ route }: FrontEndProps) {
  return (
    <div className="grid gap-5">
      {route.urgent && (
        <Banner tone="coral" icon={<I.Snowflake width={22} height={22} />} title="Freeze your card first">
          It takes a second and you can unfreeze it any time. Direct Debits and bills keep going.
        </Banner>
      )}

      <div className="relative mx-2 aspect-[1.586] overflow-hidden rounded-[18px] bg-[var(--mz-coral)] p-5 text-white shadow-[0_16px_30px_-12px_rgba(255,79,64,0.7)]">
        <div className="flex items-start justify-between">
          <span className="text-[26px] leading-none font-extrabold tracking-tight">acme</span>
          <span className="text-[13px] font-semibold opacity-90">debit</span>
        </div>
        <div aria-hidden className="mt-5 h-8 w-11 rounded-md bg-gradient-to-br from-[#f3d9a4] to-[#c9a35c]" />
        <div className="absolute inset-x-5 bottom-4 flex items-end justify-between text-[14px] font-semibold">
          <span className="tracking-[0.18em]">•••• 4291</span>
          <span className="opacity-90">08/29</span>
        </div>
        {route.urgent && (
          <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/25 px-2.5 py-1 text-[12px] font-bold">
            Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {ACTIONS.map(({ label, Icon }, i) => (
          <button key={label} type="button" className="grid justify-items-center gap-1.5 text-[12px] font-semibold">
            <span
              className={`grid size-[52px] place-items-center rounded-full ${
                i === 0 && route.urgent ? "bg-[var(--mz-blue)] text-white" : "bg-white text-[var(--mz-ink)]"
              }`}
            >
              <Icon width={22} height={22} />
            </span>
            {label}
          </button>
        ))}
      </div>

      <Group>
        <ToggleRow
          name="freeze"
          title="Freeze card"
          subtitle="Stops card payments and cash withdrawals"
          defaultChecked={route.urgent}
        />
        <Row title="Report lost or stolen" subtitle="We'll cancel this card and send a new one" chevron as="div" />
        <Row title="Order a replacement" subtitle="Arrives in 3–5 working days" chevron as="div" />
      </Group>

      <GroupLabel>Latest</GroupLabel>
      <Group>
        {RECENT.map((t) => (
          <TxnRow key={t.id} txn={t} />
        ))}
      </Group>
    </div>
  );
}
