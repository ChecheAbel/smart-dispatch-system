"use client";

import {
  NOTIFICATION_TEMPLATE_PLACEHOLDERS,
  type NotificationModule,
} from "@smart-dispatch/types";
import { Braces, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/shared/providers";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { adminHeadingClass } from "@/lib/admin-theme";
import { getAdminNotificationTemplatesMessages } from "@/translations";
import { formatMessage } from "@/translations";
import { cn } from "@/lib/utils";
import {
  getModuleDefinition,
  NOTIFICATION_MODULE_ORDER,
} from "./notification-template-modules";

type NotificationTemplatePlaceholdersGuideProps = {
  module?: NotificationModule;
  defaultOpen?: boolean;
  className?: string;
};

export function NotificationTemplatePlaceholdersGuide({
  module,
  defaultOpen = false,
  className,
}: NotificationTemplatePlaceholdersGuideProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);
  const [open, setOpen] = useState(defaultOpen);
  const modules = module ? [module] : NOTIFICATION_MODULE_ORDER;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("rounded-xl border border-slate-200/80 bg-[#f8fafb]", className)}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left",
          "rounded-xl transition-colors hover:bg-white/70",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1C3A34]/15",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34]">
            <Braces className="size-4" />
          </div>
          <div className="min-w-0">
            <p className={cn("text-sm font-bold", adminHeadingClass)}>
              {copy.shell.placeholdersToggle}
            </p>
            <p className="text-xs leading-relaxed text-slate-500">{copy.placeholders.description}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-5 border-t border-slate-200/80 px-4 py-4">
        {modules.map((moduleKey) => {
          const copyKey = getModuleDefinition(moduleKey).copyKey;
          const placeholderCopy = copy.placeholders.items[copyKey];

          return (
            <section key={moduleKey} className="space-y-3">
              {!module ? (
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                    {copy.placeholders.modules[copyKey].title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {copy.placeholders.modules[copyKey].description}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {NOTIFICATION_TEMPLATE_PLACEHOLDERS[moduleKey].map((key) => (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    title={placeholderCopy[key as keyof typeof placeholderCopy]}
                  >
                    <code className="text-[11px] font-semibold text-[#1C3A34]">{`{${key}}`}</code>
                    <p className="mt-0.5 max-w-[11rem] text-[11px] leading-snug text-slate-500">
                      {placeholderCopy[key as keyof typeof placeholderCopy]}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          {copy.placeholders.warning}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function formatTemplatesEnabledSummary(
  locale: Parameters<typeof getAdminNotificationTemplatesMessages>[0],
  enabled: number,
  total: number,
) {
  const copy = getAdminNotificationTemplatesMessages(locale);
  return formatMessage(copy.shell.summaryEnabled, { enabled: String(enabled), total: String(total) });
}
