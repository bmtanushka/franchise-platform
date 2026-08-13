// Shared className tokens for the dashboard style kit — kept in one
// place so every form/table/card reads from the same set instead of
// re-deriving Tailwind strings per component.
export const cardClass = "rounded-[10px] border border-border bg-surface shadow-[0_1px_2px_rgba(22,75,60,0.06)]";

// Every dashboard page's top-level wrapper. Deliberately no `mx-auto` —
// that was centering a narrow column in the wide <main> next to the
// sidebar, leaving a large dead gap on the left on any real monitor.
// Without it, a block element just sits flush-left. Pages that read
// better narrower (forms, single-record detail views) keep their own
// tighter max-w-* but should still drop mx-auto for the same reason.
export const pageContainerClass = "w-full max-w-6xl space-y-8";

export const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-moss/40 focus:border-moss font-body";

export const labelClass = "block text-sm font-medium text-ink mb-1 font-body";

export const primaryButtonClass =
  "rounded-md bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-moss transition-colors disabled:opacity-50 font-body";

export const secondaryButtonClass =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-sage-tint transition-colors font-body";

export const linkClass = "text-sm text-moss hover:text-forest underline transition-colors font-body";
