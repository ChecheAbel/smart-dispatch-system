"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, Send, Smartphone } from "lucide-react";
import type { NotificationTemplate } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { getAdminNotificationTemplatesMessages } from "@/translations";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

type NotificationTemplateTestPanelProps = {
  template: NotificationTemplate;
  subject: string;
  body: string;
  recipientValue: string;
  onRecipientChange: (value: string) => void;
  onSendTest: () => Promise<void>;
  canWrite: boolean;
  isSending: boolean;
};

function truncatePreview(value: string, maxLength = 180) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function NotificationTemplateTestPanel({
  template,
  subject,
  body,
  recipientValue,
  onRecipientChange,
  onSendTest,
  canWrite,
  isSending,
}: NotificationTemplateTestPanelProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);
  const testCopy = copy.test;
  const isEmail = template.channel === "email";
  const isPush = template.channel === "push";
  const usesEmailRecipient = isEmail || isPush;
  const [fieldError, setFieldError] = useState<string | null>(null);

  const previewBody = useMemo(() => truncatePreview(body), [body]);
  const previewSubject = useMemo(() => truncatePreview(subject, 120), [subject]);

  function validateRecipient(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return testCopy.recipientRequired;
    }

    if (usesEmailRecipient && !EMAIL_PATTERN.test(trimmed)) {
      return testCopy.emailInvalid;
    }

    if (!usesEmailRecipient && !PHONE_PATTERN.test(trimmed)) {
      return testCopy.phoneInvalid;
    }

    return null;
  }

  async function handleSend() {
    const error = validateRecipient(recipientValue);
    setFieldError(error);

    if (error) {
      return;
    }

    await onSendTest();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#C9B87A]/30 bg-gradient-to-br from-[#f8fafb] via-white to-[#f8fafb] dark:border-[#C9B87A]/35 dark:from-[#202630] dark:via-[#171c24] dark:to-[#1c222b]">
      <div className="flex items-start gap-3 border-b border-[#C9B87A]/20 px-4 py-3.5 dark:border-border">
        <div className="rounded-lg bg-[#1C3A34] p-2 text-white shadow-sm dark:bg-[#C9B87A] dark:text-[#151a21]">
          <Send className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={cn("text-sm font-bold", adminHeadingClass)}>{testCopy.title}</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {isEmail
              ? testCopy.descriptionEmail
              : isPush
                ? testCopy.descriptionPush
                : testCopy.descriptionSms}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {testCopy.previewTitle}
          </p>
          <div className="rounded-lg border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm dark:border-border dark:bg-[#11161d]">
            {isEmail || isPush ? (
              <p className="text-xs font-semibold text-[#1C3A34]">
                <span className="font-medium text-slate-500">
                  {isPush ? copy.titleLabel : copy.subjectLabel}:{" "}
                </span>
                {previewSubject || (isPush ? copy.titlePlaceholder : copy.subjectPlaceholder)}
              </p>
            ) : null}
            <p
              className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap text-slate-600",
                (isEmail || isPush) && "mt-2 border-t border-slate-100 pt-2 dark:border-border",
              )}
            >
              {previewBody || copy.bodyPlaceholder}
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">{testCopy.previewNote}</p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor={`template-test-${template.id}`}
            className={cn(
              "text-sm font-medium text-[#1C3A34] dark:text-foreground",
              fieldError && "text-red-700 dark:text-red-300",
            )}
          >
            {isEmail ? copy.testEmailLabel : isPush ? copy.testPushLabel : copy.testPhoneLabel}
          </Label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              {usesEmailRecipient ? (
                <Mail
                  className={cn(
                    "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2",
                    fieldError ? "text-red-400" : "text-slate-400",
                  )}
                  aria-hidden
                />
              ) : (
                <Smartphone
                  className={cn(
                    "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2",
                    fieldError ? "text-red-400" : "text-slate-400",
                  )}
                  aria-hidden
                />
              )}
              <Input
                id={`template-test-${template.id}`}
                value={recipientValue}
                onChange={(event) => {
                  onRecipientChange(event.target.value);
                  if (fieldError) {
                    setFieldError(null);
                  }
                }}
                disabled={!canWrite || isSending}
                aria-invalid={Boolean(fieldError)}
                placeholder={
                  usesEmailRecipient
                    ? isPush
                      ? copy.testPushPlaceholder
                      : copy.testEmailPlaceholder
                    : copy.testPhonePlaceholder
                }
                className={cn(
                  adminInputClass,
                  "pl-10",
                  fieldError &&
                    "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60 dark:border-red-400/40 dark:bg-red-950/25 dark:text-red-200 dark:placeholder:text-red-300/60",
                  (!canWrite || isSending) &&
                    "bg-slate-50 text-slate-500 dark:bg-muted/35 dark:text-muted-foreground",
                )}
              />
            </div>

            <Button
              type="button"
              disabled={!canWrite || isSending}
              onClick={() => void handleSend()}
              className={cn(adminPrimaryButtonClass, "w-full shrink-0 sm:w-auto")}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {isSending ? copy.testing : copy.testAction}
            </Button>
          </div>

          {fieldError ? (
            <p className="text-xs text-red-600">{fieldError}</p>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              {isEmail
                ? testCopy.emailHint
                : isPush
                  ? testCopy.pushHint
                  : testCopy.phoneHint}
            </p>
          )}
        </div>

        <p className="rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:border-border dark:bg-white/[0.035]">
          {testCopy.providerNote}
        </p>
      </div>
    </div>
  );
}
