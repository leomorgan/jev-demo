import Form from "next/form";
import { Button, Input, TextField } from "@heroui/react";
import type { Domain } from "@/lib/domain";
import { MAX_MESSAGE_CHARS } from "@/lib/jev";

// The single front door: free text in, a GET to <path>?q=… out, so every answer has a shareable URL.
export function NeedBar({ domain, q, size = "md" }: { domain: Domain; q?: string; size?: "md" | "lg" }) {
  return (
    <Form key={q} action={domain.path} className="flex gap-2" role="search">
      <TextField aria-label="Search help" className="flex-1" defaultValue={q} name="q">
        <Input
          maxLength={MAX_MESSAGE_CHARS}
          placeholder={domain.placeholder}
          className={size === "lg" ? "h-12 text-base" : undefined}
        />
      </TextField>
      <Button type="submit" variant="primary" size={size === "lg" ? "lg" : "md"}>
        Search
      </Button>
    </Form>
  );
}
