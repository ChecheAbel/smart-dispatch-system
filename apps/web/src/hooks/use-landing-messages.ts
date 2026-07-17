"use client";

import { useLocale } from "@/components/shared/providers/locale-context";
import { getLandingMessages } from "@/translations";

export function useLandingMessages() {
  const { locale } = useLocale();
  return getLandingMessages(locale);
}
