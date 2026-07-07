"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, Send, Smartphone } from "lucide-react";
import type { NotificationTemplate } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { AdminTextField } from "@/components/shared/admin-form-field";
import { Button } from "@/components/ui/button";
import { adminHeadingClass } from "@/lib/admin-theme";
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
  const [fieldError, setFieldError] = useState<string | null>(null);

  const previewBody = useMemo(() => truncatePreview(body), [body]);
  const previewSubject = useMemo(() => truncatePreview(subject, 120), [subject]);

  function validateRecipient(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return testCopy.recipientRequired;
    }

    if (isEmail && !EMAIL_PATTERN.test(trimmed)) {
      return testCopy.emailInvalid;
    }

    if (!isEmail && !PHONE_PATTERN.test(trimmed)) {
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
    <div className="overflow-hidden rounded-xl border border-[#C9B87A]/30 bg-gradient-to-br from-[#f8fafb] via-white to-[#f8fafb]">
      <div className="flex items-start gap-3 border-b border-[#C9B87A]/20 px-4 py-3.5">
        <div className="rounded-lg bg-[#1C3A34] p-2 text-white shadow-sm">
          <Send className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={cn("text-sm font-bold", adminHeadingClass)}>{testCopy.title}</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {isEmail ? testCopy.descriptionEmail : testCopy.descriptionSms}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {testCopy.previewTitle}
          </p>
          <div className="rounded-lg border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm">
            {isEmail ? (
              <p className="text-xs font-semibold text-[#1C3A34]">
                <span className="font-medium text-slate-500">{copy.subjectLabel}: </span>
                {previewSubject || copy.subjectPlaceholder}
              </p>
            ) : null}
            <p
              className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap text-slate-600",
                isEmail && "mt-2 border-t border-slate-100 pt-2",
              )}
            >
              {previewBody || copy.bodyPlaceholder}
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">{testCopy.previewNote}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <AdminTextField
            id={`template-test-${template.id}`}
            label={isEmail ? copy.testEmailLabel : copy.testPhoneLabel}
            hint={isEmail ? testCopy.emailHint : testCopy.phoneHint}
            error={fieldError ?? undefined}
            icon={isEmail ? Mail : Smartphone}
            value={recipientValue}
            onChange={(event) => {
              onRecipientChange(event.target.value);
              if (fieldError) {
                setFieldError(null);
              }
            }}
            disabled={!canWrite || isSending}
            placeholder={
              isEmail ? copy.testEmailPlaceholder : copy.testPhonePlaceholder
            }
          />

          <Button
            type="button"
            disabled={!canWrite || isSending}
            onClick={() => void handleSend()}
            className={cn(
              "h-10 w-full gap-2 rounded-lg bg-[#1C3A34] px-4 text-sm font-medium text-white hover:bg-[#162e29] lg:w-auto",
            )}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isSending ? copy.testing : copy.testAction}
          </Button>
        </div>

        <p className="rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          {testCopy.providerNote}
        </p>
      </div>
    </div>
  );
}
