import { Alert, Button, Card, Input, Label, TextField } from "@heroui/react";
import type { FrontEndProps } from "@/components/frontends/types";

const CHECKS = [
  "Look outside: are neighbours' lights or street lights off too?",
  "Check your fuse box. If a trip switch is down, push it back up.",
  "On a prepayment meter? Check it still has credit.",
];

export function OutageFrontEnd({ route }: FrontEndProps) {
  const callNow = (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Power cut? Call 105, free, day or night</Alert.Title>
        <Alert.Description>
          105 puts you through to your local network operator, who fixes cables and substations. If you smell
          gas, leave the building and call 0800 111 999.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );

  return (
    <div className="grid gap-4">
      {route.urgent && callNow}
      <Card>
        <Card.Header>
          <Card.Title>Is it just you, or the whole street?</Card.Title>
          <Card.Description>We check live faults from the network operator for your postcode.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap items-end gap-2">
            <TextField className="max-w-48" name="postcode">
              <Label>Postcode</Label>
              <Input placeholder="AB1 2CD" />
            </TextField>
            <Button variant="primary">Check for faults</Button>
          </div>
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title>Before you call</Card.Title>
        </Card.Header>
        <Card.Content>
          <ol className="grid list-decimal gap-2 pl-5 text-sm">
            {CHECKS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </Card.Content>
      </Card>
      {!route.urgent && callNow}
    </div>
  );
}
