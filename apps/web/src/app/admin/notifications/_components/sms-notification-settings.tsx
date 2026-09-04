"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Fingerprint,
  KeyRound,
  MessageSquare,
  Send,
  Smartphone,
} from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import {
  AdminPasswordField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { adminCardClass, adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import {
  fetchNotificationConfiguration,
  sendTestSms,
  updateNotificationConfiguration,
} from "@/lib/notification-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminNotificationsSmsMessages } from "@/translations";

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

function SmsSettingsSkeleton() {
  return <Skeleton className="h-[28rem] w-full rounded-xl" />;
}

type SmsNotificationSettingsProps = {
  canWrite: boolean;
};

export function SmsNotificationSettings({ canWrite }: SmsNotificationSettingsProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationsSmsMessages(locale);

  const [form, setForm] = useState<SmsFormState>(emptyForm);
  const [testPhone, setTestPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [copy.errors.loadFailed, copy.toast.loadFailed.title]);

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

  const canSendTest =
    canWrite && hasCredentials && testPhone.trim().length > 0 && !submitting && !testing;

  if (loading) {
    return <SmsSettingsSkeleton />;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border")}>
        {/* Card Header with Enabled switch */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-border sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-[var(--brand-accent)]/12 dark:text-[var(--brand-accent)]">
              <Smartphone className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn("text-base font-bold", adminHeadingClass)}>
                  {copy.sections.delivery.title}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    form.isEnabled
                      ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border border-slate-200 bg-slate-100 text-slate-600 dark:border-border dark:bg-muted dark:text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      form.isEnabled ? "bg-emerald-500" : "bg-slate-400",
                    )}
                  />
                  {form.isEnabled ? copy.form.enabled : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {copy.sections.delivery.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Switch
              checked={form.isEnabled}
              onCheckedChange={(checked) => updateField("isEnabled", checked)}
              disabled={!canWrite || submitting}
              aria-label={copy.form.enabled}
            />
          </div>
        </div>

        {/* Card Body */}
        <div className="space-y-5 p-5 sm:p-6">
          {/* Provider Badge & Info */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#1C3A34] shadow-xs dark:border-border dark:bg-card dark:text-foreground">
                SMS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-foreground">
                    {copy.provider.name}
                  </p>
                  <span className="rounded-md border border-slate-200/90 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-border dark:bg-card dark:text-slate-300">
                    HTTPS API
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                  {copy.provider.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasCredentials ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Check className="size-3 text-emerald-600" />
                  Token configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
                  Token required
                </span>
              )}
            </div>
          </div>

          {/* Form Fields: 2-column responsive layout */}
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

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

          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
            {copy.sections.credentials.note}
          </div>

          {/* Test SMS Section */}
          {canWrite ? (
            <div className="mt-4 rounded-xl border border-slate-200/80 bg-[#fbfcfc] p-4.5 dark:border-border dark:bg-muted/15">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Send className="size-4 text-[#1C3A34] dark:text-[var(--brand-accent)]" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-foreground">
                    {copy.sections.test.title}
                  </h4>
                </div>
                {!hasCredentials ? (
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    {copy.sections.test.saveFirst}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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

                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSendTest}
                  onClick={() => void handleTestSms()}
                  className="h-10 gap-1.5 text-xs font-semibold text-slate-800 sm:mb-2 dark:border-border dark:text-slate-200"
                >
                  <Send className="size-3.5" />
                  {testing ? copy.sections.test.sending : copy.sections.test.send}
                </Button>
              </div>

              <div className="mt-2 rounded-lg border border-slate-200/70 bg-white p-2.5 text-xs text-slate-600 dark:border-border dark:bg-card dark:text-slate-300">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {copy.sections.test.fixedMessageLabel}:{" "}
                </span>
                <span className="italic">{copy.sections.test.fixedMessage}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        {/* Attached Card Footer */}
        {canWrite ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-border dark:bg-card/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-500 dark:text-muted-foreground">
              {hasCredentials
                ? "AfroMessage credentials active"
                : "Configuration required for live SMS"}
            </p>

            <Button
              type="submit"
              disabled={submitting || testing}
              className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
            >
              {submitting ? copy.form.saving : copy.form.save}
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
