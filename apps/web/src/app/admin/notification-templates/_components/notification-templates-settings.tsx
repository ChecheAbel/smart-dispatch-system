"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MessageSquare, Save } from "lucide-react";
import type {
  NotificationChannel,
  NotificationModule,
  NotificationTemplate,
  NotificationTemplateRecipient,
} from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { AdminTextField, AdminTextareaField } from "@/components/shared/admin-form-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  adminCardClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  fetchNotificationTemplates,
  sendNotificationTemplateTest,
  updateNotificationTemplates,
} from "@/lib/notification-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminNotificationTemplatesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import {
  NotificationTemplatePlaceholdersGuide,
} from "./notification-template-placeholders-guide";
import { NotificationTemplateEventNav } from "./notification-template-event-nav";
import { NotificationTemplateModuleNav } from "./notification-template-module-nav";
import { NotificationTemplateTestPanel } from "./notification-template-test-panel";
import {
  getModuleDefinition,
  NOTIFICATION_MODULE_ORDER,
  parseNotificationModule,
} from "./notification-template-modules";
import {
  getEventChannelStats,
  MODULE_EVENTS,
  shouldShowTemplate,
} from "./notification-template-shared";

type TemplateFormState = {
  is_enabled: boolean;
  subject: string;
  body: string;
};

type NotificationTemplatesSettingsProps = {
  canWrite: boolean;
};

const RECIPIENT_ORDER: NotificationTemplateRecipient[] = [
  "requester",
  "applicant",
  "driver",
  "fleet_manager",
];

function RulesSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div className="space-y-4 border-b border-slate-200/80 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      </div>
      <div className="grid min-h-[32rem] lg:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)]">
        <div className="hidden space-y-3 border-r border-slate-200/80 p-3 lg:block">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-4 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function parseEvent(module: NotificationModule, value: string | null): string {
  const events = MODULE_EVENTS[module];
  return value && events.includes(value) ? value : events[0];
}

function getRecipientLabel(
  recipient: NotificationTemplateRecipient,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  if (recipient === "requester") {
    return copy.recipients.requester;
  }

  if (recipient === "driver") {
    return copy.recipients.driver;
  }

  if (recipient === "fleet_manager") {
    return copy.recipients.fleet_manager;
  }

  return copy.recipients.applicant;
}

function getChannelLabel(
  channel: NotificationChannel,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  return channel === "email" ? copy.channels.email : copy.channels.sms;
}

export function NotificationTemplatesSettings({
  canWrite,
}: NotificationTemplatesSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [formState, setFormState] = useState<Record<string, TemplateFormState>>({});
  const [testTargets, setTestTargets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTemplateId, setTestingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChannelByRecipient, setActiveChannelByRecipient] = useState<
    Record<string, NotificationChannel>
  >({});

  const activeModule = parseNotificationModule(searchParams.get("module"));
  const activeEvent = parseEvent(activeModule, searchParams.get("event"));
  const activeModuleCopy = copy.modules[getModuleDefinition(activeModule).copyKey];

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchNotificationTemplates();
        if (cancelled) {
          return;
        }

        setTemplates(result.templates);
        setFormState(
          Object.fromEntries(
            result.templates.map((template) => [
              template.id,
              {
                is_enabled: template.is_enabled,
                subject: template.subject ?? "",
                body: template.body,
              },
            ]),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : copy.errors.loadFailed;
          setError(message);
          showErrorToast({
            title: copy.toast.loadFailed.title,
            description: message,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [copy.errors.loadFailed, copy.toast.loadFailed.title]);

  const templatesByModule = useMemo(() => {
    const grouped = new Map<NotificationModule, Map<string, NotificationTemplate[]>>();

    for (const module of NOTIFICATION_MODULE_ORDER) {
      const eventMap = new Map<string, NotificationTemplate[]>();
      for (const event of MODULE_EVENTS[module]) {
        eventMap.set(event, []);
      }
      grouped.set(module, eventMap);
    }

    for (const template of templates) {
      const eventMap = grouped.get(template.module);
      if (!eventMap) {
        continue;
      }

      const list = eventMap.get(template.event) ?? [];
      list.push(template);
      eventMap.set(template.event, list);
    }

    return grouped;
  }, [templates]);

  const activeEventTemplates = useMemo(() => {
    const eventTemplates = templatesByModule.get(activeModule)?.get(activeEvent) ?? [];

    return eventTemplates
      .filter((template) => shouldShowTemplate(activeModule, activeEvent, template.recipient))
      .sort((left, right) => {
        const leftRecipient = RECIPIENT_ORDER.indexOf(left.recipient);
        const rightRecipient = RECIPIENT_ORDER.indexOf(right.recipient);
        if (leftRecipient !== rightRecipient) {
          return leftRecipient - rightRecipient;
        }

        return left.channel.localeCompare(right.channel);
      });
  }, [activeEvent, activeModule, templatesByModule]);

  const templatesByRecipient = useMemo(() => {
    const grouped = new Map<NotificationTemplateRecipient, NotificationTemplate[]>();

    for (const template of activeEventTemplates) {
      const list = grouped.get(template.recipient) ?? [];
      list.push(template);
      grouped.set(template.recipient, list);
    }

    return grouped;
  }, [activeEventTemplates]);

  const activeEventCopy = (
    copy.events[activeModule] as Record<string, { title: string; description: string } | undefined>
  )[activeEvent] ?? { title: activeEvent, description: "" };

  const activeEventStats = useMemo(
    () => getEventChannelStats(activeModule, activeEvent, templates, formState),
    [activeEvent, activeModule, formState, templates],
  );

  function updateRoute(module: NotificationModule, event: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", module);
    params.set("event", event);
    router.replace(`/admin/notification-templates?${params.toString()}`, { scroll: false });
  }

  function selectModule(module: NotificationModule) {
    updateRoute(module, MODULE_EVENTS[module][0]);
  }

  function selectEvent(event: string) {
    updateRoute(activeModule, event);
  }

  function updateTemplateForm(templateId: string, patch: Partial<TemplateFormState>) {
    setFormState((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        ...patch,
      },
    }));
  }

  function getActiveChannel(
    recipient: NotificationTemplateRecipient,
    templatesForRecipient: NotificationTemplate[],
  ): NotificationChannel {
    const key = `${activeModule}-${activeEvent}-${recipient}`;
    const stored = activeChannelByRecipient[key];
    if (stored && templatesForRecipient.some((template) => template.channel === stored)) {
      return stored;
    }

    return templatesForRecipient[0]?.channel ?? "email";
  }

  function setActiveChannel(
    recipient: NotificationTemplateRecipient,
    channel: NotificationChannel,
  ) {
    const key = `${activeModule}-${activeEvent}-${recipient}`;
    setActiveChannelByRecipient((current) => ({ ...current, [key]: channel }));
  }

  async function handleSave() {
    setSaving(true);

    try {
      const payload = templates.map((template) => {
        const form = formState[template.id];
        return {
          id: template.id,
          is_enabled: form?.is_enabled ?? template.is_enabled,
          subject: template.channel === "email" ? form?.subject ?? "" : null,
          body: form?.body ?? template.body,
        };
      });

      const result = await updateNotificationTemplates(payload);
      setTemplates(result.templates);
      setFormState(
        Object.fromEntries(
          result.templates.map((template) => [
            template.id,
            {
              is_enabled: template.is_enabled,
              subject: template.subject ?? "",
              body: template.body,
            },
          ]),
        ),
      );
      showSuccessToast({
        title: copy.toast.saved.title,
        description: copy.toast.saved.description,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.errors.saveFailed;
      showErrorToast({
        title: copy.toast.saveFailed.title,
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(template: NotificationTemplate) {
    setTestingTemplateId(template.id);

    try {
      await sendNotificationTemplateTest(template.id, {
        to: testTargets[template.id]?.trim() || undefined,
      });
      showSuccessToast({
        title: copy.toast.testSent.title,
        description: copy.toast.testSent.description,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.errors.testFailed;
      showErrorToast({
        title: copy.toast.testFailed.title,
        description: message,
      });
    } finally {
      setTestingTemplateId(null);
    }
  }

  if (loading) {
    return <RulesSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className={cn("overflow-hidden rounded-xl border", adminCardClass)}>
      <div className="border-b border-slate-200/80 bg-[#f8fafb]/80 px-4 py-4 sm:px-5">
        <NotificationTemplateModuleNav
          activeModule={activeModule}
          templates={templates}
          formState={formState}
          onSelectModule={selectModule}
        />
      </div>

      <div className="lg:grid lg:min-h-[32rem] lg:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)]">
        <NotificationTemplateEventNav
          module={activeModule}
          activeEvent={activeEvent}
          templates={templates}
          formState={formState}
          onSelectEvent={selectEvent}
          className="lg:border-r lg:border-slate-200/80"
        />

        <div className="min-w-0 flex flex-col">
            <div className="border-b border-slate-200/80 bg-white px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{activeModuleCopy.title}</p>
                  <h3 className={cn("mt-0.5 text-lg font-bold tracking-tight", adminHeadingClass)}>
                    {activeEventCopy.title}
                  </h3>
                </div>
                {activeEventStats.total > 0 ? (
                  <p
                    className="text-xs font-medium text-slate-500"
                    aria-label={formatMessage(copy.shell.channelsSummaryAria, {
                      enabled: String(activeEventStats.enabled),
                      total: String(activeEventStats.total),
                    })}
                  >
                    {formatMessage(copy.shell.summaryEnabled, {
                      enabled: String(activeEventStats.enabled),
                      total: String(activeEventStats.total),
                    })}
                  </p>
                ) : null}
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                {activeEventCopy.description}
              </p>
            </div>

            <div className="space-y-6 p-5">
              <NotificationTemplatePlaceholdersGuide module={activeModule} />

              {!canWrite ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  {copy.shell.readOnlyHint}
                </p>
              ) : null}

              {activeEventTemplates.length === 0 ? null : (
                <div className="space-y-6">
                  {[...templatesByRecipient.entries()].map(([recipient, recipientTemplates]) => {
                const activeChannel = getActiveChannel(recipient, recipientTemplates);
                const activeTemplate =
                  recipientTemplates.find((template) => template.channel === activeChannel) ??
                  recipientTemplates[0];
                const form = formState[activeTemplate.id];
                const hasEmail = recipientTemplates.some((template) => template.channel === "email");
                const hasSms = recipientTemplates.some((template) => template.channel === "sms");

                return (
                  <div
                    key={recipient}
                    className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-[#f8fafb]/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {getRecipientLabel(recipient, copy)}
                        </p>
                        <p className="text-xs text-slate-500">{copy.ruleDescription}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {hasEmail && hasSms ? (
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                            {(["email", "sms"] as const).map((channel) => {
                              const Icon = channel === "email" ? Mail : MessageSquare;
                              const isActive = activeChannel === channel;

                              return (
                                <button
                                  key={channel}
                                  type="button"
                                  onClick={() => setActiveChannel(recipient, channel)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                                    isActive
                                      ? "bg-[#1C3A34] text-white"
                                      : "text-slate-600 hover:bg-slate-50",
                                  )}
                                >
                                  <Icon className="size-3.5" />
                                  {getChannelLabel(channel, copy)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            {activeChannel === "email" ? (
                              <Mail className="size-3.5" />
                            ) : (
                              <MessageSquare className="size-3.5" />
                            )}
                            {getChannelLabel(activeChannel, copy)}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            {copy.enabledLabel}
                          </span>
                          <Switch
                            checked={form?.is_enabled ?? false}
                            disabled={!canWrite}
                            onCheckedChange={(checked) =>
                              updateTemplateForm(activeTemplate.id, { is_enabled: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      {activeTemplate.channel === "email" ? (
                        <AdminTextField
                          id={`template-subject-${activeTemplate.id}`}
                          label={copy.subjectLabel}
                          value={form?.subject ?? ""}
                          onChange={(event) =>
                            updateTemplateForm(activeTemplate.id, { subject: event.target.value })
                          }
                          disabled={!canWrite}
                          placeholder={copy.subjectPlaceholder}
                        />
                      ) : null}

                      <AdminTextareaField
                        id={`template-body-${activeTemplate.id}`}
                        label={copy.bodyLabel}
                        value={form?.body ?? ""}
                        onChange={(event) =>
                          updateTemplateForm(activeTemplate.id, { body: event.target.value })
                        }
                        disabled={!canWrite}
                        rows={6}
                        placeholder={copy.bodyPlaceholder}
                      />

                      <NotificationTemplateTestPanel
                        template={activeTemplate}
                        subject={form?.subject ?? ""}
                        body={form?.body ?? ""}
                        recipientValue={testTargets[activeTemplate.id] ?? ""}
                        onRecipientChange={(value) =>
                          setTestTargets((current) => ({
                            ...current,
                            [activeTemplate.id]: value,
                          }))
                        }
                        onSendTest={() => handleTest(activeTemplate)}
                        canWrite={canWrite}
                        isSending={testingTemplateId === activeTemplate.id}
                      />
                    </div>
                  </div>
                );
                  })}
                </div>
              )}
            </div>

            {canWrite ? (
              <div className="sticky bottom-0 z-10 mt-auto border-t border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                  >
                    <Save className="size-4" />
                    {saving ? copy.saving : copy.saveAction}
                  </Button>
                </div>
              </div>
            ) : null}
        </div>
      </div>
    </section>
  );
}
