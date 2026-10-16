"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const KEY = "jev-dev-panel";
const EVENT = "jev-dev-panel-change";

// The developer view's on/off state lives in localStorage, so it survives navigation and is per browser.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
function isOpen() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function setOpen(open: boolean) {
  try {
    localStorage.setItem(KEY, open ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const noSubscription = () => () => {};

// The developer view: a floating toggle and a drawer that sit on top of the app, never inside it:
// they're portalled to <body>, so no app container can clip or contain them. Off by default.
export function DevPanel({ children }: { children: ReactNode }) {
  const open = useSyncExternalStore(subscribe, isOpen, () => false);
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="jev-dev-panel"
        aria-label={`${open ? "Hide" : "Show"} how Jev decided`}
        className="fixed right-2 bottom-32 z-[60] grid size-8 place-items-center rounded-full bg-neutral-900/60 font-mono text-xs text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:right-4 sm:bottom-4 sm:flex sm:size-auto sm:gap-2 sm:bg-neutral-900/90 sm:px-3.5 sm:py-2"
      >
        <span aria-hidden className={`size-2 rounded-full ${open ? "bg-emerald-400" : "bg-neutral-400"}`} />
        <span aria-hidden className="hidden sm:inline">{open ? "Hide" : "Show"} how Jev decided</span>
      </button>
      <aside
        id="jev-dev-panel"
        aria-label="How Jev decided"
        hidden={!open}
        className="fixed top-0 right-0 z-50 h-full w-[24rem] max-w-full overflow-y-auto border-l border-neutral-200 bg-neutral-50 p-4 pb-20 font-sans text-neutral-900 shadow-2xl"
      >
        {children}
      </aside>
    </>,
    document.body,
  );
}
