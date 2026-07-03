"use client";

import { Languages } from "lucide-react";
import { useAdminLocale } from "@/components/admin/admin-locale-context";
import { adminHeadingClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS, type SupportedLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminLanguageSelector() {
  const { locale, localeLabel, setLocale } = useAdminLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-10 gap-2 border-slate-200 bg-white px-2.5 text-[#1C3A34] hover:bg-slate-50"
            aria-label="Select language"
          />
        }
      >
        <Languages className="size-4 text-slate-500" />
        <span className={`hidden text-sm font-medium sm:inline ${adminHeadingClass}`}>
          {localeLabel}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Language</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => setLocale(value as SupportedLocale)}
          >
            {LOCALE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.nativeLabel}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
