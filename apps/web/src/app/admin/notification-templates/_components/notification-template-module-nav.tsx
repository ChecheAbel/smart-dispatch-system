"use client";

import type { NotificationModule, NotificationTemplate } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFilterLabelClass, adminHeadingClass } from "@/lib/admin-theme";
import { getAdminNotificationTemplatesMessages } from "@/translations";
import { formatMessage } from "@/translations";
import { cn } from "@/lib/utils";
import { getModuleChannelStats } from "./notification-template-shared";
import {
  getModuleDefinition,
  groupModulesByCategory,
  type NotificationModuleCategory,
} from "./notification-template-modules";

type NotificationTemplateModuleNavProps = {
  activeModule: NotificationModule;
  templates: NotificationTemplate[];
  formState: Record<string, { is_enabled: boolean }>;
  onSelectModule: (module: NotificationModule) => void;
  className?: string;
};

function getCategoryLabel(
  category: NotificationModuleCategory,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  return copy.moduleCategories[category];
}

function getModuleCopy(
  module: NotificationModule,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  const { copyKey } = getModuleDefinition(module);
  return copy.modules[copyKey];
}

export function NotificationTemplateModuleNav({
  activeModule,
  templates,
  formState,
  onSelectModule,
  className,
}: NotificationTemplateModuleNavProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);
  const activeDefinition = getModuleDefinition(activeModule);
  const activeModuleCopy = getModuleCopy(activeModule, copy);
  const ActiveIcon = activeDefinition.icon;
  const activeStats = getModuleChannelStats(activeModule, templates, formState);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className={cn("text-sm font-bold", adminHeadingClass)}>{copy.shell.modulePickerTitle}</p>
        <p className="max-w-xl text-xs leading-relaxed text-slate-500">
          {copy.shell.modulePickerDescription}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:max-w-md">
        <Label className={cn(adminFilterLabelClass, "sr-only")} htmlFor="notification-module-picker">
          {copy.shell.modulePickerTitle}
        </Label>

        <div className="flex items-center gap-2">
          <Select
            value={activeModule}
            onValueChange={(value) => {
              if (value) {
                onSelectModule(value as NotificationModule);
              }
            }}
          >
            <SelectTrigger
              id="notification-module-picker"
              className="h-10 w-full min-w-0 whitespace-normal sm:min-w-[16rem]"
            >
              <SelectValue placeholder={copy.shell.modulePickerTitle}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#1C3A34]/8 text-[#1C3A34]">
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="truncate font-medium">{activeModuleCopy.title}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="w-[min(22rem,calc(100vw-2rem))] min-w-[18rem]"
            >
              {groupModulesByCategory().map((group) => (
                <SelectGroup key={group.category}>
                  <SelectLabel>{getCategoryLabel(group.category, copy)}</SelectLabel>
                  {group.modules.map((definition) => {
                    const moduleCopy = getModuleCopy(definition.id, copy);
                    const Icon = definition.icon;
                    const stats = getModuleChannelStats(definition.id, templates, formState);

                    return (
                      <SelectItem key={definition.id} value={definition.id} multiline>
                        <span className="flex w-full items-start gap-2.5">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
                            <Icon className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 pr-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-medium text-slate-900">{moduleCopy.title}</span>
                              {stats.total > 0 ? (
                                <span className="shrink-0 text-[10px] font-semibold text-slate-400 tabular-nums">
                                  {formatMessage(copy.shell.channelsEnabled, {
                                    enabled: String(stats.enabled),
                                    total: String(stats.total),
                                  })}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                              {moduleCopy.description}
                            </span>
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {activeStats.total > 0 ? (
            <span
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-2 text-[11px] font-semibold tabular-nums",
                activeStats.enabled > 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500",
              )}
              title={formatMessage(copy.shell.summaryEnabled, {
                enabled: String(activeStats.enabled),
                total: String(activeStats.total),
              })}
            >
              {formatMessage(copy.shell.channelsEnabled, {
                enabled: String(activeStats.enabled),
                total: String(activeStats.total),
              })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
