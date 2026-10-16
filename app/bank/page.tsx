import { FrontDoorPage } from "@/components/front-door";
import { bank } from "@/domains/bank/domain";
import { BANK_UI } from "@/domains/bank/ui/frame";

export default function BankPage({ searchParams }: PageProps<"/bank">) {
  return <FrontDoorPage domain={bank} searchParams={searchParams} ui={BANK_UI} />;
}
