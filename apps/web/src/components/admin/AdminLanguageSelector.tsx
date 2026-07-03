"use client";

import { Languages } from "lucide-react";
import { useAdminLocale } from "@/components/admin/admin-locale-context";
import { adminHeaderIconButtonClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS, type SupportedLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminLanguageSelector() {
  const { locale, setLocale } = useAdminLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={adminHeaderIconButtonClass}
            aria-label="Select language"
          />
        }
      >
        <Languages className="size-[18px] text-[#8f7d45]" strokeWidth={1.75} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-40 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => setLocale(value as SupportedLocale)}
          >
            {LOCALE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="rounded-md px-2 py-1.5"
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
