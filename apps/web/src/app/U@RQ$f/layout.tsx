"use client";

import { LocaleProvider } from "@/components/shared/providers/locale-context";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
