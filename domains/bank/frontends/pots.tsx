import * as I from "../ui/icons";
import { Amount, Field, Group, GroupLabel, Pill, Row, ToggleRow, inputCls } from "../ui/kit";
import { POTS, gbp } from "./data";

export function PotsFrontEnd() {
  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-3 pt-1">
        <div
          aria-hidden
          className="relative grid size-36 place-items-center rounded-[26px] text-[56px] shadow-[0_14px_30px_-12px_rgba(9,23,35,0.45)]"
          style={{ background: "linear-gradient(160deg,#ffd3e2,#ff8fb1 55%,#c45a8e)" }}
        >
          💍
          <span className="absolute inset-x-0 bottom-3 text-center text-[15px] font-bold text-white drop-shadow">Wedding</span>
        </div>
        <Amount value={0} size="xl" sign="none" />
        <div className="flex gap-2">
          <Pill tone="grey" icon={<I.Minus width={16} height={16} />}>
            Withdraw
          </Pill>
          <Pill icon={<I.Plus width={16} height={16} />}>Add money</Pill>
        </div>
      </div>

      <GroupLabel>Set up your pot</GroupLabel>
      <Group>
        <Field label="Name">
          <input name="potName" defaultValue="Wedding" className={inputCls} />
        </Field>
        <Field label="Savings goal">
          <input name="goal" defaultValue="£2,000" inputMode="numeric" className={inputCls} />
        </Field>
        <Row title="Save by" subtitle="About £200 a month gets you there" trail={<span className="font-semibold">Aug 2027</span>} chevron />
      </Group>
      <Group>
        <ToggleRow name="roundUps" title="Round up payments" subtitle="Spend £3.40 and 60p goes in" defaultChecked />
        <ToggleRow name="payday" title="Add £200 every payday" subtitle="On the 25th, from your main account" />
      </Group>
      <Pill block>Create pot</Pill>

      <GroupLabel>Your other pots</GroupLabel>
      <Group>
        {POTS.map((p) => {
          const pct = Math.round((p.saved / p.goal) * 100);
          return (
            <div key={p.id} className="grid gap-2 border-b border-[var(--mz-line)] py-3.5 last:border-b-0">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-10 place-items-center rounded-[11px] text-[20px]" style={{ background: p.bg }}>
                  {p.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{p.name}</span>
                  <span className="block text-[13px] text-[var(--mz-grey)]">
                    {pct}% of {gbp(p.goal)}
                  </span>
                </span>
                <Amount value={p.saved} sign="none" />
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-[#e3ebe6]"
                role="progressbar"
                aria-label={`${p.name}: ${pct}% of goal`}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-[var(--mz-green)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </Group>
    </div>
  );
}
