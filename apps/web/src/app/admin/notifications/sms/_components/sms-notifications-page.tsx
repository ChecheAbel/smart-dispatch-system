"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Fingerprint,
  KeyRound,
  MessageSquare,
  Send,
  Smartphone,
} from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  AdminFormSection,
  AdminPasswordField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  adminBadgeGoldClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  fetchNotificationConfiguration,
  sendTestSms,
  updateNotificationConfiguration,
} from "@/lib/notification-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminNotificationsSmsMessages } from "@/translations";
import { cn } from "@/lib/utils";

const AFROSMS_PROVIDER = "afrosms";
const AFROSMS_API_URL = "https://api.afromessage.com/api/send";

type SmsFormState = {
  isEnabled: boolean;
  sender: string;
  fromId: string;
  authToken: string;
};

const emptyForm: SmsFormState = {
  isEnabled: false,
  sender: "",
  fromId: "",
  authToken: "",
};

type FieldErrors = Partial<
  Record<"fromId" | "sender" | "authToken" | "testPhone", string>
>;

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

function validateSmsForm(
  form: SmsFormState,
  hasCredentials: boolean,
  validation: ReturnType<typeof getAdminNotificationsSmsMessages>["validation"],
): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.fromId.trim()) {
    errors.fromId = validation.fromIdRequired;
  }

  if (!form.sender.trim()) {
    errors.sender = validation.senderRequired;
  }

  if (!form.authToken.trim() && !hasCredentials) {
    errors.authToken = validation.authTokenRequired;
  }

  return errors;
}

function validateTestPhone(
  testPhone: string,
  validation: ReturnType<typeof getAdminNotificationsSmsMessages>["validation"],
): string | undefined {
  const phone = testPhone.trim();

  if (!phone) {
    return validation.testPhoneRequired;
  }

  if (!PHONE_PATTERN.test(phone)) {
    return validation.testPhoneInvalid;
  }

  return undefined;
}

function SmsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-[28rem] w-full rounded-xl" />
    </div>
  );
}

export function SmsNotificationsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminNotificationsSmsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);
  const canWrite = hasPermission(PERMISSIONS.notifications.write);

  const [form, setForm] = useState<SmsFormState>(emptyForm);
  const [testPhone, setTestPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadConfiguration() {
      setLoading(true);
      setError(null);

      try {
        const configuration = await fetchNotificationConfiguration("sms");
        if (cancelled) {
          return;
        }

        const settings = configuration.settings ?? {};

        setForm({
          isEnabled: configuration.is_enabled,
          sender: configuration.sender_id ?? "",
          fromId: typeof settings.from_id === "string" ? settings.from_id : "",
          authToken: "",
        });
        setHasCredentials(configuration.has_credentials);
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

    void loadConfiguration();

    return () => {
      cancelled = true;
    };
  }, [canRead, copy.errors.loadFailed, copy.toast.loadFailed.title]);

  function updateField<K extends keyof SmsFormState>(key: K, value: SmsFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }

      const next = { ...current };
      delete next[key as keyof FieldErrors];
      return next;
    });
  }

  function updateTestPhone(value: string) {
    setTestPhone(value);
    setError(null);
    setFieldErrors((current) => {
      if (!current.testPhone) {
        return current;
      }

      const next = { ...current };
      delete next.testPhone;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      return;
    }

    const nextFieldErrors = validateSmsForm(form, hasCredentials, copy.validation);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      showErrorToast({
        title: copy.validation.title,
        description: copy.validation.description,
      });
      return;
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next.fromId;
      delete next.sender;
      delete next.authToken;
      return next;
    });
    setSubmitting(true);
    setError(null);

    const settings: Record<string, unknown> = {
      from_id: form.fromId.trim() || null,
      api_url: AFROSMS_API_URL,
    };

    if (form.authToken.trim()) {
      settings.auth_token = form.authToken.trim();
    }

    try {
      const configuration = await updateNotificationConfiguration("sms", {
        is_enabled: form.isEnabled,
        provider: AFROSMS_PROVIDER,
        sender_id: form.sender.trim() || null,
        settings,
      });

      setHasCredentials(configuration.has_credentials);
      setForm((current) => ({ ...current, authToken: "" }));
      showSuccessToast(copy.toast.updateSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.toast.updateFailed.description;
      setError(message);
      showErrorToast({
        title: copy.toast.updateFailed.title,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTestSms() {
    if (!canWrite || !hasCredentials) {
      return;
    }

    const testPhoneError = validateTestPhone(testPhone, copy.validation);
    if (testPhoneError) {
      setFieldErrors((current) => ({ ...current, testPhone: testPhoneError }));
      showErrorToast({
        title: copy.validation.title,
        description: copy.validation.description,
      });
      return;
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next.testPhone;
      return next;
    });
    setTesting(true);
    setError(null);

    try {
      await sendTestSms({ to: testPhone.trim() });
      showSuccessToast(copy.toast.testSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.toast.testFailed.description;
      setError(message);
      showErrorToast({
        title: copy.toast.testFailed.title,
        description: message,
      });
    } finally {
      setTesting(false);
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const canSendTest =
    canWrite && hasCredentials && testPhone.trim().length > 0 && !submitting && !testing;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <MessageSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}>
              {copy.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              {copy.description}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <SmsPageSkeleton />
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          <AdminFormSection
            title={copy.sections.delivery.title}
            description={copy.sections.delivery.description}
            icon={Smartphone}
          >
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-[#f8fafb]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#1C3A34]">{copy.form.statusTitle}</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  {copy.form.statusDescription}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                <span className="text-sm font-medium text-slate-700">{copy.form.enabled}</span>
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(checked) => updateField("isEnabled", checked)}
                  disabled={!canWrite || submitting}
                  aria-label={copy.form.enabled}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#1C3A34]/15 bg-[#1C3A34]/[0.03] px-4 py-4">
              <p className="text-sm font-semibold text-[#1C3A34]">{copy.provider.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {copy.provider.description}
              </p>
              <p className="mt-3 font-mono text-[11px] text-slate-500">{AFROSMS_API_URL}</p>
            </div>

            <AdminTextField
              id="sms-from-id"
              label={copy.form.fromId}
              hint={copy.sections.delivery.fromIdHint}
              error={fieldErrors.fromId}
              icon={Fingerprint}
              value={form.fromId}
              onChange={(event) => updateField("fromId", event.target.value)}
              placeholder={copy.form.fromIdPlaceholder}
              disabled={!canWrite || submitting}
            />

            <AdminTextField
              id="sms-sender"
              label={copy.form.sender}
              hint={copy.sections.delivery.senderHint}
              error={fieldErrors.sender}
              icon={MessageSquare}
              value={form.sender}
              onChange={(event) => updateField("sender", event.target.value)}
              placeholder={copy.form.senderPlaceholder}
              disabled={!canWrite || submitting}
            />

            <AdminPasswordField
              id="sms-auth-token"
              label={copy.form.authToken}
              hint={copy.sections.credentials.authTokenHint}
              error={fieldErrors.authToken}
              icon={KeyRound}
              value={form.authToken}
              onChange={(event) => updateField("authToken", event.target.value)}
              placeholder={copy.form.authTokenPlaceholder}
              savedHint={copy.form.credentialSavedPlaceholder}
              showSaved={hasCredentials}
              showLabel={copy.form.showToken}
              hideLabel={copy.form.hideToken}
              disabled={!canWrite || submitting}
            />

            <div className="rounded-lg border border-dashed border-slate-200 bg-[#f8fafb]/80 px-4 py-3 text-xs leading-relaxed text-slate-500">
              {copy.sections.credentials.note}
            </div>
          </AdminFormSection>

          {canWrite ? (
            <AdminFormSection
              title={copy.sections.test.title}
              description={copy.sections.test.description}
              icon={Send}
            >
              {!hasCredentials ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {copy.sections.test.saveFirst}
                </div>
              ) : null}

              <AdminTextField
                id="sms-test-phone"
                label={copy.sections.test.phone}
                hint={copy.sections.test.phoneHint}
                error={fieldErrors.testPhone}
                icon={Smartphone}
                value={testPhone}
                onChange={(event) => updateTestPhone(event.target.value)}
                placeholder={copy.sections.test.phonePlaceholder}
                disabled={!canWrite || testing || submitting}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1C3A34]">
                  {copy.sections.test.fixedMessageLabel}
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {copy.sections.test.fixedMessage}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  {copy.sections.test.fixedMessageNote}
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSendTest}
                  onClick={() => void handleTestSms()}
                  className="gap-2"
                >
                  <Send className="size-4" />
                  {testing ? copy.sections.test.sending : copy.sections.test.send}
                </Button>
              </div>
            </AdminFormSection>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {canWrite ? (
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={submitting || testing} className={adminPrimaryButtonClass}>
                {submitting ? copy.form.saving : copy.form.save}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
