"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/shared/providers/locale-context";
import { LOCALE_OPTIONS, type SupportedLocale } from "@/lib/locale";
import { getTranslations } from "@/translations";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function LanguageSwitcher({ className, variant = "light" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const copy = getTranslations(locale).common;
  const isDark = variant === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-xl border shadow-none transition-all",
              isDark
                ? "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                : "border-slate-200 bg-white text-[#1C3A34] hover:border-[#1C3A34]/20 hover:bg-slate-50",
              className,
            )}
            aria-label={copy.selectLanguage}
          />
        }
      >
        <Languages className="h-[18px] w-[18px] text-[#C9B87A]" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
      >
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => setLocale(value as SupportedLocale)}
          >
            {LOCALE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
              >
                {option.nativeLabel}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
