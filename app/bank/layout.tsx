import type { Metadata } from "next";
import { bankSans } from "@/app/fonts";

export const metadata: Metadata = { title: "Help · Acme Bank" };

// Everything under /bank is the bank app: its own typeface and tokens.
export default function BankLayout({ children }: LayoutProps<"/bank">) {
  return <div className={`${bankSans.variable} bank-theme flex min-h-full flex-1 flex-col`}>{children}</div>;
}
