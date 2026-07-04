"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AtSign,
  Hash,
  KeyRound,
  Mail,
  Reply,
  Server,
  User,
  UserRound,
} from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  AdminFormSection,
  AdminPasswordField,
  AdminSelectField,
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
  updateNotificationConfiguration,
} from "@/lib/notification-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminNotificationsEmailMessages } from "@/translations";
import { cn } from "@/lib/utils";

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

function EmailPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-[32rem] w-full rounded-xl" />
    </div>
  );
}

export function EmailNotificationsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminNotificationsEmailMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);
  const canWrite = hasPermission(PERMISSIONS.notifications.write);

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
    if (!canRead) {
      setLoading(false);
      return;
    }

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
  }, [canRead, copy.errors.loadFailed, copy.toast.loadFailed.title]);

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

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const showSmtpFields = form.provider === "smtp";
  const showApiKeyField = form.provider === "sendgrid" || form.provider === "mailgun";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <Mail className="size-5" />
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
        <EmailPageSkeleton />
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          <AdminFormSection
            title={copy.sections.configuration.title}
            description={copy.sections.configuration.description}
            icon={Mail}
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

            <AdminSelectField
              id="email-provider"
              label={copy.form.provider}
              hint={copy.form.providerHint}
              value={form.provider}
              onValueChange={handleProviderChange}
              items={providerItems}
              disabled={!canWrite || submitting}
            />

            {providerDescription ? (
              <div className="rounded-xl border border-[#1C3A34]/15 bg-[#1C3A34]/[0.03] px-4 py-4">
                <p className="text-sm font-semibold text-[#1C3A34]">{selectedProviderLabel}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{providerDescription}</p>
              </div>
            ) : null}

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

            {showSmtpFields ? (
              <>
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
              </>
            ) : null}

            {showApiKeyField ? (
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
            ) : null}

            <div className="rounded-lg border border-dashed border-slate-200 bg-[#f8fafb]/80 px-4 py-3 text-xs leading-relaxed text-slate-500">
              {copy.sections.credentials.note}
            </div>
          </AdminFormSection>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {canWrite ? (
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={submitting} className={adminPrimaryButtonClass}>
                {submitting ? copy.form.saving : copy.form.save}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
