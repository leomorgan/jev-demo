import { Amount, Row, Tile } from "../ui/kit";
import type { Txn } from "./data";

// One line of a statement: merchant tile, name, when, amount.
export function TxnRow({ txn }: { txn: Txn }) {
  return (
    <Row
      lead={<Tile bg={txn.bg}>{txn.icon}</Tile>}
      title={txn.merchant}
      subtitle={txn.when}
      trail={<Amount value={txn.amount} />}
    />
  );
}
