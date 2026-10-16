import { Group, GroupLabel, Pill, Row, Tile } from "../ui/kit";

const OPTIONS = [
  { icon: "⏸️", bg: "#dcedf6", title: "Pause overdraft fees for 30 days", hint: "While you get advice. No catch." },
  { icon: "🗓️", bg: "#e3e8fb", title: "Line up bills against payday", hint: "See what's due when, and what can wait" },
  { icon: "🔎", bg: "#d6f2e3", title: "Check what you could get", hint: "Benefits, grants and social tariffs" },
  { icon: "💬", bg: "#fff3c4", title: "Talk it through with us", hint: "Real people, every day 8am to 8pm" },
];

const GLANCE = [
  { label: "Bills before payday", value: "£640" },
  { label: "Left to spend", value: "£410" },
  { label: "Days to payday", value: "9" },
];

export function MoneySupportFrontEnd() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 px-1">
        <p className="text-[24px] leading-tight font-extrabold tracking-tight">Let&apos;s take this one step at a time</p>
        <p className="text-[15px] leading-snug text-[var(--mz-grey)]">
          Lots of people talk to us about money. Nothing you share here affects your credit score.
        </p>
      </div>

      <Group className="grid grid-cols-3 divide-x divide-[var(--mz-line)] px-0 py-3.5">
        {GLANCE.map((g) => (
          <div key={g.label} className="grid gap-0.5 px-3">
            <span className="text-[12px] leading-tight text-[var(--mz-grey)]">{g.label}</span>
            <span className="text-[20px] font-bold tabular-nums">{g.value}</span>
          </div>
        ))}
      </Group>

      <GroupLabel>What would help most?</GroupLabel>
      <Group>
        {OPTIONS.map((o) => (
          <Row key={o.title} lead={<Tile bg={o.bg}>{o.icon}</Tile>} title={o.title} subtitle={o.hint} chevron />
        ))}
      </Group>

      <Pill block>Chat with our money team</Pill>
    </div>
  );
}
