import { Button, Card, Chip, Input, Label, Radio, RadioGroup, Tabs, TextField } from "@heroui/react";
import type { FrontEndProps } from "@/components/frontends/types";

const TARIFFS = {
  fixed: [
    { name: "Fix 12", price: "£112", note: "Price locked for 12 months", popular: true },
    { name: "Fix 24", price: "£118", note: "Price locked for 24 months", popular: false },
  ],
  variable: [
    { name: "Flex", price: "£109", note: "Follows the price cap, leave any time", popular: false },
    { name: "Flex EV", price: "£97", note: "Cheaper overnight for charging a car", popular: false },
  ],
};
const HOMES = [
  { value: "flat", label: "Flat or 1-bed" },
  { value: "mid", label: "2–3 bedrooms" },
  { value: "large", label: "4 or more bedrooms" },
];

export function QuoteFrontEnd({ route }: FrontEndProps) {
  return (
    <div className="grid gap-4">
      <Card>
        <Card.Header>
          <Card.Title>Get a price in under a minute</Card.Title>
          <Card.Description>Monthly estimates for a typical home. No account needed to look.</Card.Description>
        </Card.Header>
        <Card.Content className="grid grid-cols-1 gap-5 sm:grid-cols-[12rem_1fr]">
          <TextField name="postcode">
            <Label>Postcode</Label>
            <Input placeholder="AB1 2CD" />
          </TextField>
          <RadioGroup defaultValue="mid" name="home">
            <Label>Home size</Label>
            {HOMES.map((h) => (
              <Radio key={h.value} value={h.value}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {h.label}
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
        </Card.Content>
      </Card>
      <Tabs className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Tariff type">
            <Tabs.Tab id="fixed">
              Fixed
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="variable">
              Variable
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        {(Object.keys(TARIFFS) as (keyof typeof TARIFFS)[]).map((kind) => (
          <Tabs.Panel key={kind} id={kind} className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            {TARIFFS[kind].map((t) => (
              <Card key={t.name}>
                <Card.Header>
                  <div className="flex items-center gap-2">
                    <Card.Title>{t.name}</Card.Title>
                    {/* No sales nudges for someone who sounds under strain. */}
                    {t.popular && !route.care && (
                      <Chip color="accent" variant="soft" size="sm">
                        Most popular
                      </Chip>
                    )}
                  </div>
                  <Card.Description>{t.note}</Card.Description>
                </Card.Header>
                <Card.Content>
                  <p className="text-2xl font-semibold">
                    {t.price}
                    <span className="text-sm font-normal text-muted"> / month</span>
                  </p>
                </Card.Content>
                <Card.Footer>
                  <Button variant="secondary" fullWidth>
                    Choose {t.name}
                  </Button>
                </Card.Footer>
              </Card>
            ))}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
