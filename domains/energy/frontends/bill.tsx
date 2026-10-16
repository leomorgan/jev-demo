import { Button, Card, Chip, Label, Meter, Table } from "@heroui/react";
import type { FrontEndProps } from "@/components/frontends/types";

const LINES = [
  { item: "Electricity used", before: "£61.20", now: "£98.70", change: "+£37.50" },
  { item: "Gas used", before: "£32.40", now: "£71.10", change: "+£38.70" },
  { item: "Standing charges", before: "£16.70", now: "£16.60", change: "−£0.10" },
  { item: "Estimated reading adjustment", before: "£0.00", now: "£8.00", change: "+£8.00" },
];

export function BillFrontEnd({ route }: FrontEndProps) {
  return (
    <div className="grid gap-4">
      <Card>
        <Card.Header>
          <div className="flex flex-wrap items-center gap-2">
            <Card.Title>Your October bill: £194.40</Card.Title>
            <Chip color="warning" variant="soft" size="sm">
              +£84.10 on September
            </Chip>
          </div>
          <Card.Description>Example account. Most of the rise is heating: October was 4°C colder.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="What changed on your bill" className="min-w-[480px]">
                <Table.Header>
                  <Table.Column isRowHeader>What</Table.Column>
                  <Table.Column>September</Table.Column>
                  <Table.Column>October</Table.Column>
                  <Table.Column>Change</Table.Column>
                </Table.Header>
                <Table.Body>
                  {LINES.map((l) => (
                    <Table.Row key={l.item}>
                      <Table.Cell>{l.item}</Table.Cell>
                      <Table.Cell>{l.before}</Table.Cell>
                      <Table.Cell>{l.now}</Table.Cell>
                      <Table.Cell>{l.change}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title>Compared with similar homes</Card.Title>
        </Card.Header>
        <Card.Content>
          <Meter value={58}>
            <Label>Your use is about average for a 3-bed terrace</Label>
            <Meter.Output />
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
        </Card.Content>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Send a meter reading</Button>
        <Button variant={route.care ? "primary" : "secondary"}>Spread the cost</Button>
        <Button variant="tertiary">Question this bill</Button>
      </div>
    </div>
  );
}
