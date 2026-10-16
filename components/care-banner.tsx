import { Alert } from "@heroui/react";
import type { Domain } from "@/lib/domain";

// Care mode: shown above any front end when Jev reads distress in the message.
export function CareBanner({ domain }: { domain: Domain }) {
  return (
    <Alert status="accent">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{domain.care.title}</Alert.Title>
        <Alert.Description>{domain.care.text}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
