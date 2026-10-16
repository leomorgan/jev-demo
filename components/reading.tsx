import { Card, Skeleton, Spinner } from "@heroui/react";

/** Stock HeroUI loading state while the decision is on its way. */
export function HeroReading() {
  return (
    <Card>
      <Card.Header className="flex-row items-center gap-3">
        <Spinner size="sm" />
        <Card.Title>Finding the right help…</Card.Title>
      </Card.Header>
      <Card.Content className="grid gap-3">
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </Card.Content>
    </Card>
  );
}
