import { Amount, Group, GroupLabel, Pill, Row, Tile } from "../ui/kit";
import { PURCHASES } from "./data";

const REASONS = [
  { value: "not-received", title: "I didn't get what I paid for" },
  { value: "refund", title: "I'm still waiting for a refund" },
  { value: "cancelled", title: "I cancelled, but they keep charging me" },
  { value: "wrong-amount", title: "I was charged the wrong amount, or twice" },
];

export function DisputeFrontEnd() {
  return (
    <div className="grid gap-5">
      <p className="px-1 text-[15px] leading-snug text-[var(--mz-grey)]">
        Tell us what went wrong and we&apos;ll take it up with the seller. Most claims are settled within 15 working
        days.
      </p>

      <GroupLabel>Which payment?</GroupLabel>
      <Group>
        {PURCHASES.map((t, i) => (
          <Row
            key={t.id}
            as="label"
            className="cursor-pointer"
            lead={
              <>
                <input type="radio" name="payment" value={t.id} defaultChecked={i === 0} className="mz-radio" />
                <Tile bg={t.bg}>{t.icon}</Tile>
              </>
            }
            title={t.merchant}
            subtitle={t.when}
            trail={<Amount value={t.amount} />}
          />
        ))}
      </Group>

      <GroupLabel>What happened?</GroupLabel>
      <Group>
        {REASONS.map((r) => (
          <Row
            key={r.value}
            as="label"
            className="cursor-pointer"
            lead={<input type="radio" name="reason" value={r.value} className="mz-radio" />}
            title={<span className="font-medium">{r.title}</span>}
          />
        ))}
      </Group>

      <Group className="py-3.5">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-[var(--mz-grey)]">Anything else we should know?</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Order number, dates, what the seller said…"
            className="w-full resize-none bg-transparent text-[16px] outline-none placeholder:text-[#a3adb2]"
          />
        </label>
      </Group>

      <Pill block>Start a claim</Pill>
    </div>
  );
}
