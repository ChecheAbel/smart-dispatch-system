"use client";

import { cn } from "@/lib/utils";

export type LocationModeSwitchProps = {
  savedLabel: string;
  customLabel: string;
  useCustom: boolean;
  onSelectSaved: () => void;
  onSelectCustom: () => void;
  disabled?: boolean;
};

export function LocationModeSwitch({
  savedLabel,
  customLabel,
  useCustom,
  onSelectSaved,
  onSelectCustom,
  disabled,
}: LocationModeSwitchProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 dark:border-white/10 dark:bg-[#11161d]"
      role="group"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectSaved}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
          !useCustom
            ? "bg-white text-[#1C3A34] shadow-sm dark:bg-[#252c35] dark:text-[#e8ecf1]"
            : "text-slate-500 hover:text-slate-700 dark:text-[#8f99a6] dark:hover:text-[#d8c77f]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {savedLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectCustom}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
          useCustom
            ? "bg-white text-[#1C3A34] shadow-sm dark:bg-[#252c35] dark:text-[#e8ecf1]"
            : "text-slate-500 hover:text-slate-700 dark:text-[#8f99a6] dark:hover:text-[#d8c77f]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {customLabel}
      </button>
    </div>
  );
}
