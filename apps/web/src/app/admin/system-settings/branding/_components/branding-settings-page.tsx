"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  Palette,
  Phone,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth, useBranding, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { getAdminBrandingSettingsMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { PERMISSIONS } from "@/lib/permissions";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  DEFAULT_BRANDING_SETTINGS,
  getBrandLogoUrl,
} from "@/lib/branding";
import {
  fetchBrandingSettings,
  updateBrandingSettings,
  uploadBrandLogo,
  type BrandingSettings,
} from "@/lib/system-settings-api";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_ACCEPT = "image/jpeg,image/png,image/webp";
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

type FormState = {
  company_name: string;
  product_name: string;
  primary_color: string;
  accent_color: string;
  support_email: string;
  support_phone: string;
  website_url: string;
  logo_url: string | null;
};

type BrandingCopy = ReturnType<typeof getAdminBrandingSettingsMessages>;

function toFormState(branding: BrandingSettings): FormState {
  return {
    company_name: branding.company_name,
    product_name: branding.product_name,
    primary_color: branding.primary_color,
    accent_color: branding.accent_color,
    support_email: branding.support_email ?? "",
    support_phone: branding.support_phone ?? "",
    website_url: branding.website_url ?? "",
    logo_url: branding.logo_url,
  };
}

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function BrandingSettingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
        <div className="space-y-4 p-5 sm:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
      <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
        <div className="space-y-6 p-5 sm:p-6">
          {[0, 1, 2].map((section) => (
            <div key={section} className="space-y-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-64" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Palette;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-[#1C3A34]/6 p-2 text-[#1C3A34]">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <h2 className={cn("text-base font-bold", adminHeadingClass)}>{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-600">
      {children}
    </Label>
  );
}

function BrandPreview({
  values,
  logoSrc,
  copy,
}: {
  values: FormState;
  logoSrc: string;
  copy: BrandingCopy;
}) {
  const primary = normalizeHex(values.primary_color) ?? DEFAULT_BRANDING_SETTINGS.primary_color;
  const accent = normalizeHex(values.accent_color) ?? DEFAULT_BRANDING_SETTINGS.accent_color;
  const company = values.company_name.trim() || DEFAULT_BRANDING_SETTINGS.company_name;
  const product = values.product_name.trim() || DEFAULT_BRANDING_SETTINGS.product_name;

  return (
    <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[#C9B87A]/15 p-2 text-[#8f7d45]">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className={cn("text-base font-bold", adminHeadingClass)}>
              {copy.preview.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{copy.preview.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className="size-3.5 rounded-full ring-2 ring-white shadow-sm"
            style={{ backgroundColor: primary }}
            title={primary}
          />
          <span
            className="size-3.5 rounded-full ring-2 ring-white shadow-sm"
            style={{ backgroundColor: accent }}
            title={accent}
          />
          <span className="font-mono text-[11px] text-slate-400">
            {primary} · {accent}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <div
          className="relative overflow-hidden rounded-xl px-5 py-6"
          style={{ backgroundColor: primary }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(ellipse at 70% 20%, ${accent}, transparent 55%)`,
            }}
          />
          <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            {copy.preview.onDark}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={company}
            className="relative mt-4 h-9 w-auto max-w-[180px] object-contain brightness-0 invert"
          />
          <p
            className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            {product}
          </p>
          <p className="relative mt-1 text-sm font-semibold text-white">{company}</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-[#f8fafb] px-5 py-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${primary}, ${accent})`,
            }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {copy.preview.onLight}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={company}
            className="mt-4 h-9 w-auto max-w-[180px] object-contain"
          />
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {product}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: primary }}>
            {company}
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const valid = normalizeHex(value);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-[#f8fafb]/70 p-4">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="mt-3 flex items-center gap-3">
        <label
          htmlFor={`${id}_picker`}
          className={cn(
            "relative size-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm transition",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:ring-2 hover:ring-[#1C3A34]/15",
          )}
          style={{ backgroundColor: valid ?? "#e2e8f0" }}
        >
          <input
            id={`${id}_picker`}
            type="color"
            value={valid ?? "#1C3A34"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            disabled={disabled}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={cn(
            adminInputClass,
            "font-mono uppercase tracking-wide",
            !valid && value.trim() ? "border-red-300 focus-visible:ring-red-200" : "",
          )}
          placeholder="#1C3A34"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function BrandingSettingsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const { setBranding } = useBranding();
  const copy = getAdminBrandingSettingsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.system_settings.read);
  const canWrite = hasPermission(PERMISSIONS.system_settings.write);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<FormState>(() =>
    toFormState(DEFAULT_BRANDING_SETTINGS),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!canRead) return;

    let active = true;
    setLoading(true);

    void fetchBrandingSettings()
      .then((result) => {
        if (!active) return;
        setValues(toFormState(result));
        setBranding(result);
      })
      .catch(() => {
        if (!active) return;
        showErrorToast({
          title: copy.toast.loadFailed.title,
          description: copy.toast.loadFailed.description,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canRead, copy.toast.loadFailed.description, copy.toast.loadFailed.title, setBranding]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canWrite) return;

    if (!values.company_name.trim() || !values.product_name.trim()) {
      showErrorToast({
        title: copy.toast.invalidValues.title,
        description: copy.toast.invalidValues.description,
      });
      return;
    }

    if (
      !HEX_COLOR_PATTERN.test(values.primary_color) ||
      !HEX_COLOR_PATTERN.test(values.accent_color)
    ) {
      showErrorToast({
        title: copy.toast.invalidColors.title,
        description: copy.toast.invalidColors.description,
      });
      return;
    }

    const supportEmail = values.support_email.trim();
    if (supportEmail && !EMAIL_PATTERN.test(supportEmail)) {
      showErrorToast({
        title: copy.toast.invalidEmail.title,
        description: copy.toast.invalidEmail.description,
      });
      return;
    }

    setSaving(true);

    try {
      const saved = await updateBrandingSettings({
        company_name: values.company_name.trim(),
        product_name: values.product_name.trim(),
        logo_url: values.logo_url,
        primary_color: values.primary_color.toUpperCase(),
        accent_color: values.accent_color.toUpperCase(),
        support_email: supportEmail || null,
        support_phone: values.support_phone.trim() || null,
        website_url: values.website_url.trim() || null,
      });

      setValues(toFormState(saved));
      setBranding(saved);

      showSuccessToast({
        title: copy.toast.updateSuccess.title,
        description: copy.toast.updateSuccess.description,
      });
    } catch {
      showErrorToast({
        title: copy.toast.updateFailed.title,
        description: copy.toast.updateFailed.description,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoSelected(file: File | null) {
    if (!file || !canWrite) return;

    if (!LOGO_ACCEPT.split(",").includes(file.type)) {
      showErrorToast({
        title: copy.toast.invalidLogo.title,
        description: copy.toast.invalidLogo.description,
      });
      return;
    }

    if (file.size > LOGO_MAX_BYTES) {
      showErrorToast({
        title: copy.toast.logoTooLarge.title,
        description: copy.toast.logoTooLarge.description,
      });
      return;
    }

    setUploading(true);

    try {
      const saved = await uploadBrandLogo(file);
      setValues(toFormState(saved));
      setBranding(saved);
      showSuccessToast({
        title: copy.toast.logoUploadSuccess.title,
        description: copy.toast.logoUploadSuccess.description,
      });
    } catch {
      showErrorToast({
        title: copy.toast.logoUploadFailed.title,
        description: copy.toast.logoUploadFailed.description,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const logoPreviewSrc = getBrandLogoUrl(values.logo_url);
  const formDisabled = saving || !canWrite;

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0 space-y-3">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <Palette className="size-5" />
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
        <BrandingSettingsSkeleton />
      ) : (
        <div className="space-y-5">
          <BrandPreview values={values} logoSrc={logoPreviewSrc} copy={copy} />

          <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
            <div className="divide-y divide-slate-100">
              <section className="px-5 py-5 sm:px-6">
                <SectionHeader
                  icon={Building2}
                  title={copy.sections.identity.title}
                  description={copy.sections.identity.description}
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="company_name">{copy.fields.companyName}</FieldLabel>
                    <Input
                      id="company_name"
                      value={values.company_name}
                      onChange={(event) => updateField("company_name", event.target.value)}
                      disabled={formDisabled}
                      className={adminInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="product_name">{copy.fields.productName}</FieldLabel>
                    <Input
                      id="product_name"
                      value={values.product_name}
                      onChange={(event) => updateField("product_name", event.target.value)}
                      disabled={formDisabled}
                      className={adminInputClass}
                    />
                  </div>
                </div>
              </section>

              <section className="px-5 py-5 sm:px-6">
                <SectionHeader
                  icon={ImageIcon}
                  title={copy.sections.logo.title}
                  description={copy.sections.logo.description}
                />

                <div className="mt-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={LOGO_ACCEPT}
                    className="hidden"
                    onChange={(event) =>
                      void handleLogoSelected(event.target.files?.[0] ?? null)
                    }
                  />
                  <button
                    type="button"
                    disabled={!canWrite || uploading || saving}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group flex w-full flex-col items-stretch gap-4 rounded-xl border border-dashed border-slate-300 bg-[#f8fafb]/70 p-4 text-left transition sm:flex-row sm:items-center",
                      canWrite && !uploading && !saving
                        ? "hover:border-[#C9B87A]/70 hover:bg-[#C9B87A]/5"
                        : "cursor-not-allowed opacity-70",
                    )}
                  >
                    <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white px-4 sm:w-48">
                      {uploading ? (
                        <Loader2 className="size-6 animate-spin text-slate-400" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoPreviewSrc}
                          alt={values.company_name || copy.fields.companyName}
                          className="max-h-14 w-auto object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Upload className="size-4 text-[#1C3A34]" />
                        <p className="text-sm font-semibold text-[#1C3A34]">
                          {uploading
                            ? copy.logo.uploading
                            : values.logo_url
                              ? copy.logo.replace
                              : copy.logo.uploadButton}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{copy.logo.dropHint}</p>
                      <p className="mt-1 text-xs text-slate-400">{copy.logo.hint}</p>
                    </div>
                  </button>
                </div>
              </section>

              <section className="px-5 py-5 sm:px-6">
                <SectionHeader
                  icon={Palette}
                  title={copy.sections.colors.title}
                  description={copy.sections.colors.description}
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ColorField
                    id="primary_color"
                    label={copy.fields.primaryColor}
                    value={values.primary_color}
                    disabled={formDisabled}
                    onChange={(value) => updateField("primary_color", value)}
                  />
                  <ColorField
                    id="accent_color"
                    label={copy.fields.accentColor}
                    value={values.accent_color}
                    disabled={formDisabled}
                    onChange={(value) => updateField("accent_color", value)}
                  />
                </div>
              </section>

              <section className="px-5 py-5 sm:px-6">
                <SectionHeader
                  icon={Mail}
                  title={copy.sections.support.title}
                  description={copy.sections.support.description}
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="support_email">{copy.fields.supportEmail}</FieldLabel>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="support_email"
                        type="email"
                        value={values.support_email}
                        onChange={(event) => updateField("support_email", event.target.value)}
                        disabled={formDisabled}
                        className={cn(adminInputClass, "pl-10")}
                        placeholder="support@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="support_phone">{copy.fields.supportPhone}</FieldLabel>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="support_phone"
                        value={values.support_phone}
                        onChange={(event) => updateField("support_phone", event.target.value)}
                        disabled={formDisabled}
                        className={cn(adminInputClass, "pl-10")}
                        placeholder="+251..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="website_url">{copy.fields.websiteUrl}</FieldLabel>
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="website_url"
                        value={values.website_url}
                        onChange={(event) => updateField("website_url", event.target.value)}
                        disabled={formDisabled}
                        className={cn(adminInputClass, "pl-10")}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {canWrite ? (
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/95 px-5 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6">
                <p className="hidden text-xs text-slate-500 sm:block">
                  {copy.configure.description}
                </p>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || uploading}
                  className={cn(adminPrimaryButtonClass, "ml-auto")}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? copy.configure.savingButton : copy.configure.saveButton}
                </Button>
              </div>
            ) : (
              <div className="border-t border-slate-200/80 px-5 py-3.5 sm:px-6">
                <p className="text-sm text-slate-500">{copy.configure.readOnlyHint}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
