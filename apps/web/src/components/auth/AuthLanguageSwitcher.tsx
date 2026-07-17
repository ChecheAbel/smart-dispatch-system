"use client";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { cn } from "@/lib/utils";

type AuthLanguageSwitcherProps = {
  className?: string;
};

export function AuthLanguageSwitcher({ className }: AuthLanguageSwitcherProps) {
  return <LanguageSwitcher variant="light" className={cn(className)} />;
}
