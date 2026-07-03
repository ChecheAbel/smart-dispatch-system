"use client";

import { Check, X } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  adminToastClass,
  adminToastDescriptionClass,
  adminToastErrorClass,
  adminToastSuccessClass,
  adminToastTitleClass,
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      closeButton
      gap={10}
      icons={{
        success: (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#C9B87A]/15 text-[#1C3A34]">
            <Check className="size-3.5" strokeWidth={2.5} />
          </div>
        ),
        error: (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
            <X className="size-3.5" strokeWidth={2.5} />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: cn(adminToastClass, "!items-start !gap-3"),
          icon: "!m-0 shrink-0 self-start",
          content: "min-w-0 flex-1",
          title: cn(adminToastTitleClass, "leading-snug"),
          description: cn(adminToastDescriptionClass, "leading-relaxed"),
          closeButton:
            "!absolute !right-2 !top-2 !left-auto transform-none flex size-6 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-400 transition-colors hover:bg-[#f8fafb] hover:text-[#1C3A34]",
          success: adminToastSuccessClass,
          error: adminToastErrorClass,
        },
      }}
      {...props}
    />
  );
}
