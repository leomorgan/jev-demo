import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { Card, SearchField } from "@heroui/react";
import { pickableNeeds } from "@/lib/domain";
import type { FrontEndProps } from "./types";

export function GeneralFrontEnd({ domain }: FrontEndProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>How can we help?</Card.Title>
        <Card.Description>Search our help, or start from a popular topic.</Card.Description>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <SearchField aria-label="Search help" name="search">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search help articles" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <div className="flex flex-wrap gap-2">
          {pickableNeeds(domain).map((id) => (
            <Link
              key={id}
              href={{ pathname: domain.path, query: { q: domain.needs[id].label, need: id } }}
              className={buttonVariants({ variant: "tertiary", size: "sm" })}
            >
              {domain.needs[id].label}
            </Link>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
