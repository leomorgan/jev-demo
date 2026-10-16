import type { FrontEndProps } from "@/components/frontends/types";
import { pickableNeeds, type Domain } from "@/lib/domain";
import * as I from "../ui/icons";
import { Group, GroupLabel, Row, Tile } from "../ui/kit";
import { TOPIC_TILES } from "./data";

/** Topic rows: tapping one opens that screen for the person's own message (or the topic's name). */
export function TopicRows({ domain, ids, message }: { domain: Domain; ids: string[]; message?: string }) {
  return (
    <Group>
      {ids.map((id) => {
        const tile = TOPIC_TILES[id] ?? TOPIC_TILES.other;
        return (
          <Row
            key={id}
            href={{ pathname: domain.path, query: { q: message ?? domain.needs[id].label, need: id } }}
            lead={<Tile bg={tile.bg}>{tile.icon}</Tile>}
            title={domain.needs[id].label}
            subtitle={domain.needs[id].hint}
            chevron
          />
        );
      })}
    </Group>
  );
}

export function ContactRows() {
  return (
    <Group>
      <Row
        lead={
          <Tile bg="#dcedf6" round>
            <I.Chat width={20} height={20} className="text-[var(--mz-blue)]" />
          </Tile>
        }
        title="Chat with us"
        subtitle="We usually reply in a few minutes"
        chevron
      />
      <Row
        lead={
          <Tile bg="#d6f2e3" round>
            <I.Phone width={20} height={20} className="text-[var(--mz-green)]" />
          </Tile>
        }
        title="Call us"
        subtitle="0808 157 0193, 24 hours a day"
        chevron
      />
    </Group>
  );
}

// Clarify: the message didn't say what the person needs, so ask with one tap, likeliest first.
export function ClarifyFrontEnd({ message, route, domain }: FrontEndProps) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1 px-1">
        <p className="text-[24px] leading-tight font-extrabold tracking-tight">Which of these is closest?</p>
        <p className="text-[15px] text-[var(--mz-grey)]">So we can take you to the right place first time.</p>
      </div>
      <TopicRows domain={domain} ids={[...route.alternatives, "other"]} message={message} />
    </div>
  );
}

export function GeneralFrontEnd({ domain }: FrontEndProps) {
  return (
    <div className="grid gap-5">
      <GroupLabel>Popular topics</GroupLabel>
      <TopicRows domain={domain} ids={pickableNeeds(domain)} />
      <GroupLabel>Get in touch</GroupLabel>
      <ContactRows />
    </div>
  );
}
