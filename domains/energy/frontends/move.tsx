import { Alert, Button, Card, Input, Label, ProgressBar, Radio, RadioGroup, TextField } from "@heroui/react";
import type { FrontEndProps } from "@/components/frontends/types";

const DIRECTIONS = [
  { value: "out", label: "Moving out of an Acme home" },
  { value: "in", label: "Moving into a new home" },
  { value: "both", label: "Both: take Acme with me" },
];

export function MoveFrontEnd({ route }: FrontEndProps) {
  return (
    <div className="grid gap-4">
      {route.urgent && (
        <Alert status="accent">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Moving today?</Alert.Title>
            <Alert.Description>
              Take a photo of each meter before you hand over the keys. That&apos;s all we need; the rest can wait.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <Card>
        <Card.Header>
          <Card.Title>Tell us you&apos;re moving</Card.Title>
          <Card.Description>Three short steps. We&apos;ll close your old account and send a final bill.</Card.Description>
        </Card.Header>
        <Card.Content className="grid gap-5">
          <ProgressBar value={33}>
            <Label>Step 1 of 3</Label>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <RadioGroup defaultValue="both" name="direction">
            <Label>What&apos;s happening?</Label>
            {DIRECTIONS.map((d) => (
              <Radio key={d.value} value={d.value}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {d.label}
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="date" type="date">
              <Label>Moving date</Label>
              <Input />
            </TextField>
            <TextField name="postcode">
              <Label>New postcode</Label>
              <Input placeholder="AB1 2CD" />
            </TextField>
          </div>
        </Card.Content>
        <Card.Footer>
          <Button variant="primary">Continue</Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
