"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeftRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  Palette,
  Phone,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth, useBranding, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { getAdminBrandingSettingsMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { PERMISSIONS } from "@/lib/permissions";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_BRAND_LOGO_SRC,
  formatWebsiteLabel,
  getBrandLogoUrl,
  normalizeWebsiteHref,
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

const COLOR_PRESETS = [
  {
    id: "emerald-gold",
    name: "Emerald & Gold",
    tagline: "Enterprise Standard",
    primary: "#1C3A34",
    accent: "#C9B87A",
  },
  {
    id: "midnight-sapphire",
    name: "Midnight Sapphire",
    tagline: "Modern Tech",
    primary: "#0F172A",
    accent: "#38BDF8",
  },
  {
    id: "royal-amber",
    name: "Royal & Amber",
    tagline: "Executive Fleet",
    primary: "#1E1B4B",
    accent: "#F59E0B",
  },
  {
    id: "forest-mint",
    name: "Forest & Mint",
    tagline: "Clean Mobility",
    primary: "#064E3B",
    accent: "#34D399",
  },
  {
    id: "obsidian-flame",
    name: "Obsidian & Flame",
    tagline: "High Velocity",
    primary: "#18181B",
    accent: "#F97316",
  },
  {
    id: "crimson-rose",
    name: "Crimson & Rose",
    tagline: "Dynamic Logistics",
    primary: "#450A0A",
    accent: "#FB7185",
  },
] as const;

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

/** Computes WCAG relative luminance for accessibility evaluation */
function getRelativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Computes WCAG contrast ratio between two hex colors */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof Palette;
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", adminIconBoxClass)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-base font-bold", adminHeadingClass)}>{title}</h2>
            {badge}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200"
    >
      {children}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </Label>
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
  const [copied, setCopied] = useState(false);

  // Contrast against pure white
  const contrastOnWhite = valid ? getContrastRatio(valid, "#FFFFFF") : 0;
  const isHighContrast = contrastOnWhite >= 4.5;

  function copyHex() {
    if (!valid) return;
    void navigator.clipboard.writeText(valid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:border-slate-300 dark:border-border dark:bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {valid ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-tight",
              isHighContrast
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
            )}
            title={`Contrast ratio ${contrastOnWhite.toFixed(1)}:1 on white text`}
          >
            {isHighContrast ? "WCAG AA" : "Low Contrast"} ({contrastOnWhite.toFixed(1)}:1)
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <label
          htmlFor={`${id}_picker`}
          className={cn(
            "relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-300/80 shadow-xs transition hover:scale-105 active:scale-95 dark:border-slate-700",
            disabled && "cursor-not-allowed opacity-60",
          )}
          style={{ backgroundColor: valid ?? "#CBD5E1" }}
          title="Click to pick color"
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

        <div className="relative flex-1">
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className={cn(
              adminInputClass,
              "pr-9 font-mono uppercase tracking-wider",
              !valid && value.trim() ? "border-red-300 focus-visible:ring-red-200" : "",
            )}
            placeholder="#1C3A34"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={copyHex}
            disabled={!valid}
            title={copied ? "Copied!" : "Copy hex"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandingSettingsSkeleton() {
  return (
    <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border shadow-xs")}>
      <div className="divide-y divide-slate-100 dark:divide-border">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-60" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:px-6 dark:border-border dark:bg-muted/20">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-28 rounded-xl" />
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
  const [savedValues, setSavedValues] = useState<FormState>(() =>
    toFormState(DEFAULT_BRANDING_SETTINGS),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [logoBackdrop, setLogoBackdrop] = useState<"light" | "dark" | "transparent">("light");

  useEffect(() => {
    if (!canRead) return;

    let active = true;

    void fetchBrandingSettings()
      .then((result) => {
        if (!active) return;
        const initial = toFormState(result);
        setValues(initial);
        setSavedValues(initial);
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

  const isDirty = useMemo(() => {
    return (
      values.company_name !== savedValues.company_name ||
      values.product_name !== savedValues.product_name ||
      values.primary_color !== savedValues.primary_color ||
      values.accent_color !== savedValues.accent_color ||
      values.support_email !== savedValues.support_email ||
      values.support_phone !== savedValues.support_phone ||
      values.website_url !== savedValues.website_url ||
      values.logo_url !== savedValues.logo_url
    );
  }, [values, savedValues]);

  function handleDiscard() {
    setValues(savedValues);
  }

  function handleSwapColors() {
    setValues((current) => ({
      ...current,
      primary_color: current.accent_color,
      accent_color: current.primary_color,
    }));
  }

  function applyColorPreset(primary: string, accent: string) {
    setValues((current) => ({
      ...current,
      primary_color: primary,
      accent_color: accent,
    }));
  }

  function handleResetLogo() {
    setValues((current) => ({ ...current, logo_url: null }));
  }

  async function handleSave() {
    if (!canWrite || !isDirty) return;

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

      const next = toFormState(saved);
      setValues(next);
      setSavedValues(next);
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
      const next = toFormState(saved);
      setValues(next);
      setSavedValues(next);
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

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!canWrite || uploading || saving) return;
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!canWrite || uploading || saving) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleLogoSelected(file);
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const logoPreviewSrc = getBrandLogoUrl(values.logo_url);
  const formDisabled = saving || !canWrite;
  const isCustomLogo = Boolean(values.logo_url && values.logo_url !== DEFAULT_BRAND_LOGO_SRC);

  return (
    <div className="min-w-0 space-y-6 pb-6">
      {loading ? (
        <BrandingSettingsSkeleton />
      ) : (
        <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border shadow-xs")}>
          <div className="divide-y divide-slate-100 dark:divide-border">
            {/* Section 1: Company & Product Identity */}
            <section className="p-5 sm:p-6">
              <SectionHeader
                icon={Building2}
                title={copy.sections.identity.title}
                description={copy.sections.identity.description}
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="company_name" required>
                    {copy.fields.companyName}
                  </FieldLabel>
                  <Input
                    id="company_name"
                    value={values.company_name}
                    onChange={(event) => updateField("company_name", event.target.value)}
                    disabled={formDisabled}
                    className={adminInputClass}
                    placeholder="e.g., Ethiopian Investment Holdings"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    Shown on billing invoices, sign-in title, and footer.
                  </p>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="product_name" required>
                    {copy.fields.productName}
                  </FieldLabel>
                  <Input
                    id="product_name"
                    value={values.product_name}
                    onChange={(event) => updateField("product_name", event.target.value)}
                    disabled={formDisabled}
                    className={adminInputClass}
                    placeholder="e.g., Smart Dispatch"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    Shown on browser tab titles, header eyebrow, and emails.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Brand Logo */}
            <section className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionHeader
                  icon={ImageIcon}
                  title={copy.sections.logo.title}
                  description={copy.sections.logo.description}
                />
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide",
                    isCustomLogo
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-border dark:bg-muted dark:text-slate-400",
                  )}
                >
                  {isCustomLogo ? "Custom Mark Active" : "Default Mark Active"}
                </Badge>
              </div>

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

                <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
                  {/* Active Logo Showcase (5 cols) */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4.5 dark:border-border dark:bg-muted/15 lg:col-span-5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                          Active Mark
                        </span>

                        {/* Backdrop Switcher */}
                        <div className="flex items-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs dark:border-border dark:bg-card">
                          <button
                            type="button"
                            onClick={() => setLogoBackdrop("light")}
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                              logoBackdrop === "light"
                                ? "bg-slate-100 font-bold text-slate-900 dark:bg-muted dark:text-foreground"
                                : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                            )}
                            title="White Background"
                          >
                            Light
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoBackdrop("dark")}
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                              logoBackdrop === "dark"
                                ? "bg-slate-100 font-bold text-slate-900 dark:bg-muted dark:text-foreground"
                                : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                            )}
                            title="Brand Dark Surface"
                          >
                            Brand
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoBackdrop("transparent")}
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                              logoBackdrop === "transparent"
                                ? "bg-slate-100 font-bold text-slate-900 dark:bg-muted dark:text-foreground"
                                : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                            )}
                            title="Checkerboard Transparency Grid"
                          >
                            Grid
                          </button>
                        </div>
                      </div>

                      {/* Canvas Preview Container */}
                      <div
                        className="relative mt-3 flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 p-5 shadow-2xs transition-all duration-300 dark:border-slate-800"
                        style={
                          logoBackdrop === "dark"
                            ? {
                                backgroundColor:
                                  normalizeHex(values.primary_color) ??
                                  DEFAULT_BRANDING_SETTINGS.primary_color,
                              }
                            : logoBackdrop === "transparent"
                              ? {
                                  backgroundImage:
                                    "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)",
                                  backgroundSize: "16px 16px",
                                }
                              : {
                                  backgroundColor: "#ffffff",
                                }
                        }
                      >
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2
                              className={cn(
                                "size-7 animate-spin",
                                logoBackdrop === "dark" ? "text-white" : "text-slate-500",
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                logoBackdrop === "dark" ? "text-white/80" : "text-slate-500",
                              )}
                            >
                              {copy.logo.uploading}
                            </span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoPreviewSrc}
                            alt={values.company_name || copy.fields.companyName}
                            className={cn(
                              "max-h-24 w-auto max-w-full object-contain transition-all duration-200",
                              logoBackdrop === "dark" && "brightness-0 invert",
                            )}
                          />
                        )}
                      </div>
                    </div>

                    {/* Action Controls below Preview */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 dark:border-slate-800">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                        {isCustomLogo ? "Custom uploaded asset" : "Default system asset"}
                      </span>

                      {isCustomLogo && canWrite ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={uploading || saving}
                          onClick={handleResetLogo}
                          className="h-7 gap-1.5 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          title="Revert back to default Smart Dispatch mark"
                        >
                          <Trash2 className="size-3" />
                          {copy.logo.resetDefault ?? "Reset to default"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Interactive Dropzone & Upload Target (7 cols) */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 lg:col-span-7",
                      isDragOver
                        ? "border-[#C9B87A] bg-[#C9B87A]/10 scale-[1.01]"
                        : "border-slate-200/90 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-muted/10 dark:hover:border-slate-700",
                    )}
                  >
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80 dark:bg-card dark:ring-border">
                      <Upload className="size-6 text-[#1C3A34] dark:text-[var(--brand-accent)]" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                      {values.logo_url ? copy.logo.replace : copy.logo.uploadButton}
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-muted-foreground">
                      {copy.logo.dropHint}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        disabled={!canWrite || uploading || saving}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(adminPrimaryButtonClass, "h-9 rounded-xl px-4 text-xs font-semibold shadow-xs")}
                      >
                        <Upload className="size-3.5" />
                        {uploading
                          ? copy.logo.uploading
                          : values.logo_url
                            ? copy.logo.replace
                            : copy.logo.uploadButton}
                      </Button>
                    </div>

                    {/* Accepted formats & specs */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200/60 pt-4 text-[11px] text-slate-400 dark:border-slate-800 dark:text-muted-foreground">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        PNG, JPG, WEBP
                      </span>
                      <span>•</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Max 5 MB
                      </span>
                      <span>•</span>
                      <span>Transparent background recommended</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Colors & Theme Tokens */}
            <section className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <SectionHeader
                  icon={Palette}
                  title={copy.sections.colors.title}
                  description={copy.sections.colors.description}
                />

                {canWrite ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSwapColors}
                    disabled={formDisabled}
                    className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-accent"
                    title="Swap primary and accent colors"
                  >
                    <ArrowLeftRight className="size-3.5" />
                    <span className="hidden sm:inline">Swap Colors</span>
                  </Button>
                ) : null}
              </div>

              <div className="mt-5 space-y-6">
                {/* Curated Presets Bar */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    Curated Palettes
                  </label>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected =
                        values.primary_color.toUpperCase() === preset.primary &&
                        values.accent_color.toUpperCase() === preset.accent;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={formDisabled}
                          onClick={() => applyColorPreset(preset.primary, preset.accent)}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150",
                            isSelected
                              ? "border-[#C9B87A] bg-[#C9B87A]/10 ring-1 ring-[#C9B87A]/50 shadow-xs"
                              : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-accent",
                            formDisabled && "opacity-60 cursor-not-allowed",
                          )}
                        >
                          <div className="flex -space-x-1.5 shrink-0">
                            <span
                              className="size-5 rounded-full border-2 border-white shadow-2xs dark:border-slate-900"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span
                              className="size-5 rounded-full border-2 border-white shadow-2xs dark:border-slate-900"
                              style={{ backgroundColor: preset.accent }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {preset.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-400 dark:text-muted-foreground">
                              {preset.tagline}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Color Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </section>

            {/* Section 4: Support & Contact Details */}
            <section className="p-5 sm:p-6">
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
                      placeholder="support@organization.gov.et"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    Shown to drivers and customers on receipts and help dialogues.
                  </p>
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
                      placeholder="+251 11 000 0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="website_url">{copy.fields.websiteUrl}</FieldLabel>
                    {values.website_url.trim() ? (
                      <a
                        href={normalizeWebsiteHref(values.website_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <span>{formatWebsiteLabel(values.website_url)}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="website_url"
                      value={values.website_url}
                      onChange={(event) => updateField("website_url", event.target.value)}
                      disabled={formDisabled}
                      className={cn(adminInputClass, "pl-10")}
                      placeholder="https://organization.gov.et"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Integrated Settings Card Footer: Save Changes Bar */}
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {saving ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-[#1C3A34] dark:text-[var(--brand-accent)]" />
              ) : isDirty ? (
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                </span>
              ) : (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {saving
                    ? "Saving brand settings…"
                    : isDirty
                      ? copy.configure.unsavedChanges ?? "You have unsaved changes"
                      : copy.configure.allSaved ?? "All changes saved"}
                </p>
                <p className="hidden truncate text-[11px] text-slate-500 dark:text-muted-foreground sm:block">
                  {copy.configure.description}
                </p>
              </div>
            </div>

            {canWrite ? (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {isDirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={saving || uploading}
                    className="h-9 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-accent"
                  >
                    <RotateCcw className="size-3.5" />
                    {copy.configure.discardButton ?? "Discard"}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || uploading || !isDirty}
                  className={cn(adminPrimaryButtonClass, "h-9 rounded-xl px-4 text-xs font-semibold shadow-xs")}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saving ? copy.configure.savingButton : copy.configure.saveButton}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {copy.configure.readOnlyHint}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
