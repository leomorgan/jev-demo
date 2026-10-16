import { Card, Chip, Label, Meter, Separator } from "@heroui/react";
import { URGENCY_LEVELS, needIds, type Domain } from "@/lib/domain";
import type { NeedDecision } from "@/lib/jev";
import type { Route } from "@/lib/route";

const pct = (p: number) => Math.round(p * 100);
const MAX_URGENCY = URGENCY_LEVELS.length - 1;

function Bar({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Meter color={accent ? "accent" : "default"} size="sm" value={value}>
      <Label className="text-xs">{label}</Label>
      <Meter.Output className="text-xs" />
      <Meter.Track>
        <Meter.Fill />
      </Meter.Track>
    </Meter>
  );
}

// "Why am I seeing this page?" Everything Jev returned and every rule that fired.
export function XRay({
  domain,
  decision,
  route,
  frontEndName,
}: {
  domain: Domain;
  decision: NeedDecision;
  route: Route;
  frontEndName: string;
}) {
  const level = URGENCY_LEVELS[Math.round(decision.urgency)];
  return (
    <Card variant="secondary">
      <Card.Header>
        <Card.Title>How Jev picked this page</Card.Title>
        <Card.Description>
          One call to typesafe-ai/jev · {decision.ms} ms
          {decision.inputTokens != null && ` · ${decision.inputTokens} tokens`}
          {decision.costUsd != null && ` · $${decision.costUsd.toFixed(6)}`}
        </Card.Description>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip color="accent" size="sm">
            {frontEndName}
          </Chip>
          {route.care && (
            <Chip color="warning" size="sm" variant="soft">
              care
            </Chip>
          )}
          {route.urgent && (
            <Chip color="danger" size="sm" variant="soft">
              urgent
            </Chip>
          )}
        </div>

        <section className="grid gap-2">
          <h4 className="text-sm font-medium">
            Need <span className="font-normal text-muted">(choice) · confidence {decision.needConfidence.toFixed(2)}</span>
          </h4>
          {needIds(domain).map((id) => (
            <Bar
              key={id}
              accent={id === decision.need}
              label={domain.needs[id].label}
              value={pct(decision.needProbabilities[id] ?? 0)}
            />
          ))}
        </section>
        <Separator />
        <section className="grid gap-2">
          <h4 className="text-sm font-medium">
            Urgency{" "}
            <span className="font-normal text-muted">
              (score 0–{MAX_URGENCY}) · {decision.urgency.toFixed(2)}
            </span>
          </h4>
          <Bar label={level} value={pct(decision.urgency / MAX_URGENCY)} accent={route.urgent} />
          <h4 className="text-sm font-medium">
            Distress <span className="font-normal text-muted">(boolean) · P(true)</span>
          </h4>
          <Bar label="Worried, scared or struggling" value={pct(decision.distress)} accent={route.care} />
        </section>
        <Separator />
        <section className="grid gap-1">
          <h4 className="text-sm font-medium">Rules that fired (in code, not the model)</h4>
          <ul className="grid gap-1 font-mono text-xs text-muted">
            {route.rule.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
        <section className="grid gap-1">
          <h4 className="text-sm font-medium">State sent to Jev</h4>
          <pre className="overflow-x-auto rounded-lg bg-default p-2 font-mono text-xs whitespace-pre-wrap">
            {JSON.stringify(decision.state, null, 2)}
          </pre>
        </section>
      </Card.Content>
    </Card>
  );
}
