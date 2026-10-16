// Example account data for the Acme Bank screens. Fictional merchants and figures.

export interface Txn {
  id: string;
  merchant: string;
  /** Emoji or initials shown on the merchant tile. */
  icon: string;
  /** Tile background. */
  bg: string;
  when: string;
  /** Negative for spending, positive for money in. */
  amount: number;
}

export const RECENT: Txn[] = [
  { id: "t1", merchant: "Bean There Coffee", icon: "☕", bg: "#f6e3c8", when: "Today, 08:12", amount: -3.4 },
  { id: "t2", merchant: "Night Bus", icon: "🚌", bg: "#d9e8fb", when: "Yesterday, 23:48", amount: -1.75 },
  { id: "t3", merchant: "The Red Lion", icon: "🍺", bg: "#fbe0d5", when: "Yesterday, 21:05", amount: -18.6 },
  { id: "t4", merchant: "Sam Patel", icon: "SP", bg: "#d8f5a2", when: "Yesterday · “Pizza 🍕”", amount: 12 },
];

export const UNRECOGNISED: Txn[] = [
  { id: "u1", merchant: "XYZ LTD", icon: "?", bg: "#e6ebe8", when: "Today, 10:41 · Online", amount: -249.99 },
  { id: "u2", merchant: "PARCELFEE*UK", icon: "?", bg: "#e6ebe8", when: "Today, 10:39 · Online", amount: -150 },
  { id: "u3", merchant: "Bean There Coffee", icon: "☕", bg: "#f6e3c8", when: "Today, 08:12", amount: -3.4 },
];

export const PURCHASES: Txn[] = [
  { id: "p1", merchant: "Northside Trainers", icon: "👟", bg: "#e3dcfb", when: "12 Sep · Online", amount: -89 },
  { id: "p2", merchant: "City Gym", icon: "🏋️", bg: "#d6f2e3", when: "1 Oct · Direct Debit", amount: -30 },
  { id: "p3", merchant: "FuelUp Petrol", icon: "⛽", bg: "#fbe9c6", when: "Today, 07:55", amount: -62.1 },
  { id: "p4", merchant: "FuelUp Petrol", icon: "⛽", bg: "#fbe9c6", when: "Today, 07:55", amount: -62.1 },
];

export const POTS = [
  { id: "holiday", name: "Holiday", icon: "🏝️", bg: "linear-gradient(160deg,#ffb36b,#ff5e57 55%,#7a3b8f)", saved: 640, goal: 1500 },
  { id: "rainy", name: "Rainy day", icon: "☔", bg: "linear-gradient(160deg,#9fd4f5,#3f8fd0)", saved: 1210, goal: 2000 },
];

/** One emoji and tile colour per help topic. */
export const TOPIC_TILES: Record<string, { icon: string; bg: string }> = {
  lost_card: { icon: "💳", bg: "#ffe1dc" },
  fraud: { icon: "🚨", bg: "#fde7c8" },
  dispute: { icon: "🧾", bg: "#e3e8fb" },
  money_worries: { icon: "💛", bg: "#fff3c4" },
  saving: { icon: "🐷", bg: "#fbe0ee" },
  other: { icon: "💬", bg: "#dcedf6" },
};

export const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
