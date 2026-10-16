import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import * as I from "./icons";

// The bank app's component kit: a study of a modern UK app bank's UI (grouped white cards on a
// pale mint ground, merchant tiles, pence set small, pill buttons, a floating tab bar).

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- device ---------- */

export function StatusBar() {
  return (
    <div className="flex h-12 shrink-0 items-end justify-between px-7 pb-1.5 text-[15px] font-semibold">
      <span>9:41</span>
      <span aria-hidden className="flex items-center gap-1.5">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="5" y="5" width="3" height="6" rx="1" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="15" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .4 10.4 10.4 0 0 0 .8 3.3L2 4.6c1.6-1.5 3.7-2.4 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.6 6.6 0 0 0 8 4a6.6 6.6 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3zm0 3.5 1.8-1.9A2.6 2.6 0 0 0 8 6.7a2.6 2.6 0 0 0-1.8.7L8 9.3z" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="currentColor" opacity=".4" />
          <rect x="2" y="2" width="19" height="8" rx="2" fill="currentColor" />
          <path d="M24 4v4" stroke="currentColor" strokeLinecap="round" opacity=".4" />
        </svg>
      </span>
    </div>
  );
}

const TABS = [
  { label: "Home", Icon: I.Home },
  { label: "Trends", Icon: I.Trends },
  { label: "Payments", Icon: I.Payments },
  { label: "Help", Icon: I.Help, href: "/bank" },
];

export function TabBar({ active = "Help" }: { active?: string }) {
  return (
    <nav
      aria-label="App"
      className="absolute inset-x-4 bottom-6 z-10 grid grid-cols-4 rounded-[30px] bg-white/85 p-1.5 shadow-[0_8px_30px_-8px_rgba(9,23,35,0.25)] backdrop-blur-xl"
    >
      {TABS.map(({ label, Icon, href }) => {
        const on = label === active;
        const inner = (
          <span
            className={cx(
              "flex flex-col items-center gap-0.5 rounded-[24px] py-1.5 text-[11px] font-semibold",
              on ? "bg-[#dcedf6] text-[var(--mz-blue)]" : "text-[var(--mz-ink)]",
            )}
          >
            <Icon width={22} height={22} />
            {label}
          </span>
        );
        return href ? (
          <Link key={label} href={href} aria-current={on ? "page" : undefined}>
            {inner}
          </Link>
        ) : (
          <span key={label}>{inner}</span>
        );
      })}
    </nav>
  );
}

/** The app. On phones it is the page; from `sm` up it sits in a device frame. */
export function Phone({ children, framed = "responsive" }: { children: ReactNode; framed?: "responsive" | "always" }) {
  const f = framed === "always";
  return (
    <div
      className={cx(
        "relative flex w-full flex-col overflow-hidden bg-[var(--mz-app)]",
        f
          ? "h-[760px] w-[360px] rounded-[48px] border-[10px] border-black shadow-2xl"
          : "h-dvh sm:h-[844px] sm:w-[390px] sm:rounded-[56px] sm:border-[12px] sm:border-black sm:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]",
      )}
    >
      <div className={cx(f ? "block" : "hidden sm:block")}>
        <div aria-hidden className="absolute top-2.5 left-1/2 z-20 h-8 w-28 -translate-x-1/2 rounded-full bg-black" />
        <StatusBar />
      </div>
      <div className="mz-scroll relative flex-1 overflow-y-auto px-4 pt-3 pb-32">{children}</div>
      <TabBar />
      <div aria-hidden className={cx("absolute bottom-2 left-1/2 h-1.5 w-32 -translate-x-1/2 rounded-full bg-black", f ? "block" : "hidden sm:block")} />
    </div>
  );
}

/* ---------- screens ---------- */

export function RoundButton({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  const cls = "grid size-10 place-items-center rounded-full bg-white text-[var(--mz-ink)] shadow-sm";
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {children}
    </Link>
  ) : (
    <span aria-label={label} role="img" className={cls}>
      {children}
    </span>
  );
}

/** A pushed screen: round back button, centred title, then content. */
export function Sheet({ title, back = "/bank", children }: { title: string; back?: string; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <RoundButton href={back} label="Back">
          <I.ChevronLeft width={20} height={20} />
        </RoundButton>
        <h1 className="text-center text-[17px] font-bold">{title}</h1>
      </header>
      {children}
    </div>
  );
}

export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-[22px] bg-white px-4", className)}>{children}</div>;
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <h2 className="-mb-3 px-1 text-[15px] font-semibold text-[var(--mz-grey)]">{children}</h2>;
}

/** A list row; rows inside a Group are separated by hairlines. */
export function Row({
  lead,
  title,
  subtitle,
  trail,
  href,
  chevron,
  as: As = "div",
  className,
  ...rest
}: {
  lead?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trail?: ReactNode;
  href?: ComponentProps<typeof Link>["href"];
  chevron?: boolean;
  as?: "div" | "label";
  className?: string;
} & Record<string, unknown>) {
  const body = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug font-semibold [overflow-wrap:anywhere]">{title}</span>
        {subtitle && <span className="block text-[13px] leading-snug text-[var(--mz-grey)]">{subtitle}</span>}
      </span>
      {trail}
      {chevron && <I.ChevronRight width={18} height={18} className="shrink-0 text-[#a3adb2]" />}
    </>
  );
  const cls = cx("flex items-center gap-3 border-b border-[var(--mz-line)] py-3.5 last:border-b-0", className);
  if (href)
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  return (
    <As className={cls} {...rest}>
      {body}
    </As>
  );
}

export function Tile({ children, bg, size = 40, round = false }: { children: ReactNode; bg: string; size?: number; round?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx("grid shrink-0 place-items-center text-[18px] font-bold", round ? "rounded-full" : "rounded-[11px]")}
      style={{ background: bg, width: size, height: size }}
    >
      {children}
    </span>
  );
}

/** £1,234.56 with the pence set small, the way app banks show money. Positive amounts are income. */
export function Amount({ value, size = "md", sign = "auto" }: { value: number; size?: "md" | "xl"; sign?: "auto" | "none" }) {
  const income = value > 0 && sign === "auto";
  const [pounds, pence] = Math.abs(value).toFixed(2).split(".");
  const big = size === "xl";
  return (
    <span
      className={cx("shrink-0 font-semibold tabular-nums tracking-tight", income && "text-[var(--mz-green)]")}
      aria-label={`${income ? "plus " : ""}£${Math.abs(value).toFixed(2)}`}
    >
      {income && "+"}
      {big && <span className="align-[0.6em] text-[0.45em]">£</span>}
      <span className={big ? "text-[44px]" : "text-[19px]"}>{Number(pounds).toLocaleString("en-GB")}</span>
      <span className={big ? "text-[22px]" : "text-[13px]"}>.{pence}</span>
    </span>
  );
}

type Tone = "blue" | "grey" | "coral" | "red" | "white";
const PILL: Record<Tone, string> = {
  blue: "bg-[var(--mz-blue)] text-white",
  grey: "bg-[var(--mz-chip)] text-[var(--mz-blue)]",
  coral: "bg-[var(--mz-coral)] text-white",
  red: "bg-[#e5372b] text-white",
  white: "bg-white text-[var(--mz-ink)]",
};

/** Pill button. `block` makes the full-width call to action at the end of a flow. */
export function Pill({
  tone = "blue",
  block,
  icon,
  children,
  href,
  type = "button",
}: {
  tone?: Tone;
  block?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  href?: ComponentProps<typeof Link>["href"];
  type?: "button" | "submit";
}) {
  const cls = cx(
    "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
    block ? "h-[52px] w-full text-[16px]" : "h-9 px-4 text-[15px]",
    PILL[tone],
  );
  return href ? (
    <Link href={href} className={cls}>
      {icon}
      {children}
    </Link>
  ) : (
    <button type={type} className={cls}>
      {icon}
      {children}
    </button>
  );
}

const BANNER: Record<"coral" | "red" | "blue", string> = {
  coral: "bg-[#ffe3df] text-[#7a1d14]",
  red: "bg-[#fde2df] text-[#7a1d14]",
  blue: "bg-[#dcedf6] text-[#0b3f57]",
};

export function Banner({ tone, icon, title, children }: { tone: keyof typeof BANNER; icon: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className={cx("flex gap-3 rounded-[22px] p-4", BANNER[tone])} role="note">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="grid gap-1">
        <p className="text-[16px] font-bold">{title}</p>
        {children && <div className="text-[14px] leading-snug opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function ToggleRow({ title, subtitle, name, defaultChecked }: { title: string; subtitle?: string; name: string; defaultChecked?: boolean }) {
  return (
    <Row
      as="label"
      title={title}
      subtitle={subtitle}
      trail={<input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} className="mz-switch" />}
      className="cursor-pointer"
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 border-b border-[var(--mz-line)] py-3.5 last:border-b-0">
      <span className="text-[13px] font-semibold text-[var(--mz-grey)]">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "w-full bg-transparent text-[17px] font-semibold outline-none placeholder:text-[#a3adb2]";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-[22px] bg-[#dfe7e2]", className)} />;
}
