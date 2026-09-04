"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AtSign,
  Check,
  Hash,
  KeyRound,
  Mail,
  Reply,
  Server,
  User,
  UserRound,
} from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import {
  AdminPasswordField,
  AdminSelectField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { adminCardClass, adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import {
  fetchNotificationConfiguration,
  updateNotificationConfiguration,
} from "@/lib/notification-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminNotificationsEmailMessages } from "@/translations";

type EmailFormState = {
  isEnabled: boolean;
  provider: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  apiKey: string;
};

type FieldErrors = Partial<
  Record<
    | "fromEmail"
    | "fromName"
    | "replyTo"
    | "smtpHost"
    | "smtpPort"
    | "smtpUsername"
    | "smtpPassword"
    | "apiKey",
    string
  >
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm: EmailFormState = {
  isEnabled: false,
  provider: "smtp",
  fromEmail: "",
  fromName: "",
  replyTo: "",
  smtpHost: "",
  smtpPort: "587",
  smtpUsername: "",
  smtpPassword: "",
  apiKey: "",
};

function validateEmailForm(
  form: EmailFormState,
  hasCredentials: boolean,
  validation: ReturnType<typeof getAdminNotificationsEmailMessages>["validation"],
): FieldErrors {
  const errors: FieldErrors = {};
  const fromEmail = form.fromEmail.trim();
  const fromName = form.fromName.trim();
  const replyTo = form.replyTo.trim();

  if (!fromEmail) {
    errors.fromEmail = validation.fromEmailRequired;
  } else if (!EMAIL_PATTERN.test(fromEmail)) {
    errors.fromEmail = validation.fromEmailInvalid;
  }

  if (!fromName) {
    errors.fromName = validation.fromNameRequired;
  }

  if (replyTo && !EMAIL_PATTERN.test(replyTo)) {
    errors.replyTo = validation.replyToInvalid;
  }

  if (form.provider === "smtp") {
    if (!form.smtpHost.trim()) {
      errors.smtpHost = validation.smtpHostRequired;
    }

    const smtpPort = form.smtpPort.trim();
    if (!smtpPort) {
      errors.smtpPort = validation.smtpPortRequired;
    } else {
      const port = Number(smtpPort);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        errors.smtpPort = validation.smtpPortInvalid;
      }
    }

    if (!form.smtpUsername.trim()) {
      errors.smtpUsername = validation.smtpUsernameRequired;
    }

    if (!form.smtpPassword.trim() && !hasCredentials) {
      errors.smtpPassword = validation.smtpPasswordRequired;
    }
  }

  if ((form.provider === "sendgrid" || form.provider === "mailgun") && !form.apiKey.trim() && !hasCredentials) {
    errors.apiKey = validation.apiKeyRequired;
  }

  return errors;
}

function EmailSettingsSkeleton() {
  return <Skeleton className="h-[32rem] w-full rounded-xl" />;
}

type EmailNotificationSettingsProps = {
  canWrite: boolean;
};

export function EmailNotificationSettings({ canWrite }: EmailNotificationSettingsProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationsEmailMessages(locale);

  const [form, setForm] = useState<EmailFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerItems = copy.providers.map((provider) => ({
    label: provider.label,
    value: provider.value,
  }));

  const selectedProviderLabel =
    providerItems.find((item) => item.value === form.provider)?.label ?? form.provider;

  const providerDescription =
    copy.providerDescriptions[form.provider as keyof typeof copy.providerDescriptions] ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadConfiguration() {
      setLoading(true);
      setError(null);

      try {
        const configuration = await fetchNotificationConfiguration("email");
        if (cancelled) {
          return;
        }

        const settings = configuration.settings ?? {};
        setForm({
          isEnabled: configuration.is_enabled,
          provider: configuration.provider ?? "smtp",
          fromEmail: configuration.from_email ?? "",
          fromName: configuration.from_name ?? "",
          replyTo: configuration.reply_to ?? "",
          smtpHost: String(settings.smtp_host ?? ""),
          smtpPort: String(settings.smtp_port ?? "587"),
          smtpUsername: String(settings.smtp_username ?? ""),
          smtpPassword: "",
          apiKey: "",
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

  function updateField<K extends keyof EmailFormState>(key: K, value: EmailFormState[K]) {
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

  function handleProviderChange(value: string) {
    updateField("provider", value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.smtpHost;
      delete next.smtpPort;
      delete next.smtpUsername;
      delete next.smtpPassword;
      delete next.apiKey;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      return;
    }

    const nextFieldErrors = validateEmailForm(form, hasCredentials, copy.validation);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      showErrorToast({
        title: copy.validation.title,
        description: copy.validation.description,
      });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setError(null);

    const settings: Record<string, unknown> = {
      smtp_host: form.smtpHost.trim() || null,
      smtp_port: form.smtpPort.trim() || null,
      smtp_username: form.smtpUsername.trim() || null,
    };

    if (form.smtpPassword.trim()) {
      settings.smtp_password = form.smtpPassword.trim();
    }

    if (form.apiKey.trim()) {
      settings.api_key = form.apiKey.trim();
    }

    try {
      const configuration = await updateNotificationConfiguration("email", {
        is_enabled: form.isEnabled,
        provider: form.provider || null,
        from_email: form.fromEmail.trim() || null,
        from_name: form.fromName.trim() || null,
        reply_to: form.replyTo.trim() || null,
        settings,
      });

      setHasCredentials(configuration.has_credentials);
      setForm((current) => ({ ...current, smtpPassword: "", apiKey: "" }));
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

  const showSmtpFields = form.provider === "smtp";
  const showApiKeyField = form.provider === "sendgrid" || form.provider === "mailgun";

  if (loading) {
    return <EmailSettingsSkeleton />;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border")}>
        {/* Card Header with Enabled switch */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-border sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-[var(--brand-accent)]/12 dark:text-[var(--brand-accent)]">
              <Mail className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn("text-base font-bold", adminHeadingClass)}>
                  {copy.sections.configuration.title}
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
                {copy.sections.configuration.description}
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
        <div className="space-y-6 p-5 sm:p-6">
          {/* Provider Selection & Status */}
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <AdminSelectField
                id="email-provider"
                label={copy.form.provider}
                hint={copy.form.providerHint}
                value={form.provider}
                onValueChange={handleProviderChange}
                items={providerItems}
                disabled={!canWrite || submitting}
              />

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-border dark:bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-foreground">
                    {selectedProviderLabel}
                  </p>
                  {hasCredentials ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Check className="size-3 text-emerald-600" />
                      Configured
                    </span>
                  ) : null}
                </div>
                {providerDescription ? (
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                    {providerDescription}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Sender Identity (2 Columns) */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2 dark:border-border">
              <p className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-muted-foreground">
                Sender information
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminTextField
                id="email-from-email"
                type="email"
                label={copy.form.fromEmail}
                hint={copy.form.fromEmailHint}
                error={fieldErrors.fromEmail}
                icon={AtSign}
                value={form.fromEmail}
                onChange={(event) => updateField("fromEmail", event.target.value)}
                placeholder={copy.form.fromEmailPlaceholder}
                disabled={!canWrite || submitting}
              />

              <AdminTextField
                id="email-from-name"
                label={copy.form.fromName}
                hint={copy.form.fromNameHint}
                error={fieldErrors.fromName}
                icon={UserRound}
                value={form.fromName}
                onChange={(event) => updateField("fromName", event.target.value)}
                placeholder={copy.form.fromNamePlaceholder}
                disabled={!canWrite || submitting}
              />
            </div>

            <AdminTextField
              id="email-reply-to"
              type="email"
              label={copy.form.replyTo}
              hint={copy.form.replyToHint}
              error={fieldErrors.replyTo}
              icon={Reply}
              value={form.replyTo}
              onChange={(event) => updateField("replyTo", event.target.value)}
              placeholder={copy.form.replyToPlaceholder}
              optional
              disabled={!canWrite || submitting}
            />
          </div>

          {/* SMTP Connection Credentials (2 Columns) */}
          {showSmtpFields ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 dark:border-border">
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-muted-foreground">
                  SMTP connection settings
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <AdminTextField
                    id="email-smtp-host"
                    label={copy.form.smtpHost}
                    hint={copy.form.smtpHostHint}
                    error={fieldErrors.smtpHost}
                    icon={Server}
                    value={form.smtpHost}
                    onChange={(event) => updateField("smtpHost", event.target.value)}
                    placeholder={copy.form.smtpHostPlaceholder}
                    disabled={!canWrite || submitting}
                  />
                </div>

                <div>
                  <AdminTextField
                    id="email-smtp-port"
                    label={copy.form.smtpPort}
                    hint={copy.form.smtpPortHint}
                    error={fieldErrors.smtpPort}
                    icon={Hash}
                    value={form.smtpPort}
                    onChange={(event) => updateField("smtpPort", event.target.value)}
                    placeholder={copy.form.smtpPortPlaceholder}
                    disabled={!canWrite || submitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminTextField
                  id="email-smtp-username"
                  label={copy.form.smtpUsername}
                  hint={copy.form.smtpUsernameHint}
                  error={fieldErrors.smtpUsername}
                  icon={User}
                  value={form.smtpUsername}
                  onChange={(event) => updateField("smtpUsername", event.target.value)}
                  placeholder={copy.form.smtpUsernamePlaceholder}
                  disabled={!canWrite || submitting}
                />

                <AdminPasswordField
                  id="email-smtp-password"
                  label={copy.form.smtpPassword}
                  hint={copy.form.smtpPasswordHint}
                  error={fieldErrors.smtpPassword}
                  icon={KeyRound}
                  value={form.smtpPassword}
                  onChange={(event) => updateField("smtpPassword", event.target.value)}
                  placeholder={copy.form.smtpPasswordPlaceholder}
                  savedHint={copy.form.credentialSavedPlaceholder}
                  showSaved={hasCredentials}
                  showLabel={copy.form.showPassword}
                  hideLabel={copy.form.hidePassword}
                  disabled={!canWrite || submitting}
                />
              </div>
            </div>
          ) : null}

          {/* Cloud API Key */}
          {showApiKeyField ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 dark:border-border">
                <p className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-muted-foreground">
                  API Key & Authentication
                </p>
              </div>

              <AdminPasswordField
                id="email-api-key"
                label={copy.form.apiKey}
                hint={copy.form.apiKeyHint}
                error={fieldErrors.apiKey}
                icon={KeyRound}
                value={form.apiKey}
                onChange={(event) => updateField("apiKey", event.target.value)}
                placeholder={copy.form.apiKeyPlaceholder}
                savedHint={copy.form.credentialSavedPlaceholder}
                showSaved={hasCredentials}
                showLabel={copy.form.showApiKey}
                hideLabel={copy.form.hideApiKey}
                disabled={!canWrite || submitting}
              />
            </div>
          ) : null}

          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
            {copy.sections.credentials.note}
          </div>

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
                ? "Outbound credentials securely stored"
                : "Credentials required before sending messages"}
            </p>

            <Button
              type="submit"
              disabled={submitting}
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
