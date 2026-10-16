import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react";
import type { FrontEndProps } from "./types";

// When the message doesn't say what the person needs, ask a one-tap question instead of
// guessing. Every need is offered, ordered by Jev's probabilities.
export function ClarifyFrontEnd({ message, route, domain }: FrontEndProps) {
  const options = [...route.alternatives, "other"];
  return (
    <Card>
      <Card.Header>
        <Card.Title>Which of these is closest?</Card.Title>
        <Card.Description>So we can show you the right page first time.</Card.Description>
      </Card.Header>
      <Card.Content className="grid gap-2">
        {options.map((id) => (
          <Link
            key={id}
            href={{ pathname: domain.path, query: { q: message, need: id } }}
            className={buttonVariants({ variant: id === "other" ? "tertiary" : "secondary", fullWidth: true })}
          >
            {domain.needs[id].label}
          </Link>
        ))}
      </Card.Content>
    </Card>
  );
}
