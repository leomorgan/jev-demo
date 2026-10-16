import * as I from "../ui/icons";
import { Amount, Banner, Group, GroupLabel, Pill, Row, Tile } from "../ui/kit";
import { UNRECOGNISED } from "./data";

const NEXT = [
  { title: "We freeze your card", body: "Straight away, so nothing else can go out." },
  { title: "We look into every payment", body: "Our fraud team usually replies within 24 hours." },
  { title: "We'll message you in the app", body: "We never call to ask for a code or to move money." },
];

export function FraudFrontEnd() {
  return (
    <div className="grid gap-5">
      <Banner tone="red" icon={<I.Alert width={22} height={22} />} title="Stop. Don't send any more money.">
        We&apos;ll never ask you to move money to a “safe account”, read out a code or install an app. If someone did,
        hang up. It was a scam.
      </Banner>

      <GroupLabel>Which payments weren&apos;t you?</GroupLabel>
      <Group>
        {UNRECOGNISED.map((t, i) => (
          <Row
            key={t.id}
            as="label"
            className="cursor-pointer"
            lead={
              <>
                <input type="checkbox" name="flagged" value={t.id} defaultChecked={i < 2} className="mz-check" />
                <Tile bg={t.bg}>{t.icon}</Tile>
              </>
            }
            title={t.merchant}
            subtitle={t.when}
            trail={<Amount value={t.amount} />}
          />
        ))}
      </Group>
      <Pill tone="red" block>
        Report 2 payments
      </Pill>

      <GroupLabel>What happens next</GroupLabel>
      <Group>
        {NEXT.map((n, i) => (
          <Row
            key={n.title}
            lead={
              <Tile bg="#dcedf6" size={32} round>
                <span className="text-[14px] text-[var(--mz-blue)]">{i + 1}</span>
              </Tile>
            }
            title={n.title}
            subtitle={n.body}
          />
        ))}
      </Group>
    </div>
  );
}
