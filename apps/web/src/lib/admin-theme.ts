/** Brand tokens for the admin console — aligned with the public sign-in experience. */
export const adminTheme = {
  brand: "var(--brand-primary)",
  brandHover: "color-mix(in srgb, var(--brand-primary) 85%, black)",
  gold: "var(--brand-accent)",
  goldDark: "#8f7d45",
  goldSoft: "#e8d69a",
  surface: "#f8fafb",
  sidebarWidth: "18.5rem",
} as const;

export const adminEyebrowClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]";

export const adminHeadingClass = "font-bold text-[var(--brand-primary)]";

export const adminCardClass = "border-slate-200/80 bg-white shadow-sm";

export const adminIconBoxClass =
  "rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] p-2 text-[var(--brand-primary)]";

export const adminBadgeGoldClass =
  "border-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] text-[#8f7d45] hover:bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)]";

export const adminBadgeSuccessClass =
  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

export const adminNavButtonClass =
  "rounded-lg px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:font-semibold";

export const adminHeaderActionsClass = "flex items-center gap-2";

export const adminHeaderIconButtonClass =
  "size-9 rounded-full border-0 bg-transparent p-0 text-[var(--brand-primary)] shadow-none hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)]";

export const adminHeaderControlClass =
  "h-9 gap-2 rounded-lg border-0 bg-transparent px-2.5 text-[var(--brand-primary)] shadow-none hover:bg-[#f8fafb]";

export const adminInputClass =
  "h-10 rounded-lg border-slate-200 bg-white px-3.5 text-sm shadow-sm";

export const adminFilterLabelClass = "text-sm font-medium text-slate-600";

export const adminDatePickerTriggerClass =
  "h-10 w-full justify-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal shadow-sm transition-colors hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)] hover:bg-[#f8fafb] focus-visible:border-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] data-[empty=true]:text-slate-400 data-[state=open]:border-[color-mix(in_srgb,var(--brand-accent)_60%,transparent)] data-[state=open]:ring-3 data-[state=open]:ring-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]";

export const adminDatePickerPopoverClass =
  "w-auto overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)] bg-white p-0 shadow-lg";

export const adminDatePickerCalendarClass =
  "p-4 [&_button[data-slot=button]]:min-h-10 [&_button[data-slot=button]]:min-w-10 [&_button[data-slot=button]]:text-sm [&_[data-selected-single=true]]:bg-[var(--brand-primary)] [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]:hover]:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] [&_[data-range-end=true]]:bg-[var(--brand-primary)] [&_[data-range-start=true]]:bg-[var(--brand-primary)] [&_button[data-slot=button]:hover]:bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] [&_button[data-slot=button]:hover]:text-[var(--brand-primary)]";

export const adminSearchInputClass =
  "h-10 rounded-lg border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm shadow-sm";

export const adminButtonClass = "h-10 gap-2 rounded-lg px-4 text-sm font-medium";

export const adminPrimaryButtonClass =
  "h-10 gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium text-white hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)]";

export const adminPaginationButtonClass =
  "h-9 min-w-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-sm text-[var(--brand-primary)] shadow-sm hover:bg-[#f8fafb]";

export const adminPaginationIconButtonClass =
  "size-9 rounded-lg border-slate-200 bg-white text-[var(--brand-primary)] shadow-sm hover:bg-[#f8fafb]";

export const adminToastClass =
  "rounded-lg border border-slate-200/80 bg-white shadow-lg";

export const adminToastTitleClass = "text-sm font-semibold text-[var(--brand-primary)]";

export const adminToastDescriptionClass = "text-sm text-slate-500";

export const adminToastSuccessClass =
  "border-l-[3px] border-l-[var(--brand-accent)]";

export const adminToastErrorClass = "border-l-[3px] border-l-red-400";
