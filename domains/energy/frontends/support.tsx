import { Button, Card, Description, Label, Radio, RadioGroup } from "@heroui/react";

const OPTIONS = [
  { value: "spread", label: "Pay in smaller amounts", hint: "Spread what you owe over up to 12 months" },
  { value: "pause", label: "Pause payments for 30 days", hint: "No reminders and no extra charges while you get advice" },
  { value: "grants", label: "Check for grants and discounts", hint: "Takes two minutes; most people miss at least one" },
  { value: "talk", label: "Talk it through with a person", hint: "A specialist team; we'll never try to sell you anything" },
];

export function SupportFrontEnd() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Let&apos;s find something that helps</Card.Title>
        <Card.Description>
          You won&apos;t be cut off while we work this out together. Pick whatever feels easiest; you can change your
          mind later.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <RadioGroup name="help">
          <Label>What would help most right now?</Label>
          {OPTIONS.map((o) => (
            <Radio key={o.value} value={o.value}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {o.label}
              </Radio.Content>
              <Description>{o.hint}</Description>
            </Radio>
          ))}
        </RadioGroup>
      </Card.Content>
      <Card.Footer>
        <Button variant="primary">Continue</Button>
      </Card.Footer>
    </Card>
  );
}
