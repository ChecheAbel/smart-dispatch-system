/** Brand tokens for the admin console — aligned with the public sign-in experience. */
export const adminTheme = {
  brand: "#1C3A34",
  brandHover: "#162e29",
  gold: "#C9B87A",
  goldDark: "#8f7d45",
  goldSoft: "#e8d69a",
  surface: "#f8fafb",
  sidebarWidth: "18.5rem",
} as const;

export const adminEyebrowClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9B87A]";

export const adminHeadingClass = "font-bold text-[#1C3A34]";

export const adminCardClass = "border-slate-200/80 bg-white shadow-sm";

export const adminIconBoxClass = "rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34]";

export const adminBadgeGoldClass =
  "border-[#C9B87A]/30 bg-[#C9B87A]/10 text-[#8f7d45] hover:bg-[#C9B87A]/10";

export const adminBadgeSuccessClass =
  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";

export const adminNavButtonClass =
  "rounded-lg px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:font-semibold";

export const adminHeaderActionsClass = "flex items-center gap-2";

export const adminHeaderIconButtonClass =
  "size-9 rounded-full border-0 bg-transparent p-0 text-[#1C3A34] shadow-none hover:bg-[#1C3A34]/6";

export const adminHeaderControlClass =
  "h-9 gap-2 rounded-lg border-0 bg-transparent px-2.5 text-[#1C3A34] shadow-none hover:bg-[#f8fafb]";

export const adminInputClass =
  "h-10 rounded-lg border-slate-200 bg-white px-3.5 text-sm shadow-sm";

export const adminFilterLabelClass = "text-sm font-medium text-slate-600";

export const adminDatePickerTriggerClass =
  "h-10 w-full justify-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal shadow-sm transition-colors hover:border-[#C9B87A]/50 hover:bg-[#f8fafb] focus-visible:border-[#1C3A34]/30 focus-visible:ring-3 focus-visible:ring-[#1C3A34]/10 data-[empty=true]:text-slate-400 data-[state=open]:border-[#C9B87A]/60 data-[state=open]:ring-3 data-[state=open]:ring-[#1C3A34]/8";

export const adminDatePickerPopoverClass =
  "w-auto overflow-hidden rounded-xl border border-[#C9B87A]/25 bg-white p-0 shadow-lg";

export const adminDatePickerCalendarClass =
  "p-4 [&_button[data-slot=button]]:min-h-10 [&_button[data-slot=button]]:min-w-10 [&_button[data-slot=button]]:text-sm [&_[data-selected-single=true]]:bg-[#1C3A34] [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]:hover]:bg-[#162e29] [&_[data-range-end=true]]:bg-[#1C3A34] [&_[data-range-start=true]]:bg-[#1C3A34] [&_button[data-slot=button]:hover]:bg-[#1C3A34]/8 [&_button[data-slot=button]:hover]:text-[#1C3A34]";

export const adminSearchInputClass =
  "h-10 rounded-lg border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm shadow-sm";

export const adminButtonClass = "h-10 gap-2 rounded-lg px-4 text-sm font-medium";

export const adminPrimaryButtonClass =
  "h-10 gap-2 rounded-lg bg-[#1C3A34] px-4 text-sm font-medium text-white hover:bg-[#162e29]";

export const adminPaginationButtonClass =
  "h-9 min-w-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-sm text-[#1C3A34] shadow-sm hover:bg-[#f8fafb]";

export const adminPaginationIconButtonClass =
  "size-9 rounded-lg border-slate-200 bg-white text-[#1C3A34] shadow-sm hover:bg-[#f8fafb]";

export const adminToastClass =
  "rounded-lg border border-slate-200/80 bg-white shadow-lg";

export const adminToastTitleClass = "text-sm font-semibold text-[#1C3A34]";

export const adminToastDescriptionClass = "text-sm text-slate-500";

export const adminToastSuccessClass = "border-l-[3px] border-l-[#C9B87A]";

export const adminToastErrorClass = "border-l-[3px] border-l-red-400";