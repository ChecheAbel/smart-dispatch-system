"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import type { PaymentGatewayField, PaymentGatewayKind, PaymentGatewayMethod } from "@/lib/system-settings-api";
import { uploadPaymentMethodLogo } from "@/lib/system-settings-api";
import { formatMessage, getAdminPaymentGatewaySettingsMessages } from "@/translations";
import { showErrorToast } from "@/lib/toast";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminSelectField } from "@/components/shared/admin-form-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  PAYMENT_GATEWAY_KINDS,
  createPaymentGatewayMethod,
  hasRequiredDetails,
  isSecretPaymentFieldKey,
  methodLogoSrc,
  nextCustomFieldKey,
  normalizePaymentField,
  PAYMENT_METHOD_LOGO_ACCEPT,
  PAYMENT_METHOD_LOGO_MAX_BYTES,
  slugifyPaymentFieldKey,
} from "@/lib/payment-gateway";

type Copy = ReturnType<typeof getAdminPaymentGatewaySettingsMessages>;

type PaymentMethodFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: Copy;
  existingMethods: PaymentGatewayMethod[];
  method?: PaymentGatewayMethod | null;
  onSubmit: (method: PaymentGatewayMethod) => Promise<void>;
};

type FormPair = {
  id: string;
  key: string;
  value: string;
};

type FormState = {
  name: string;
  description: string;
  enabled: boolean;
  logo_url: string | null;
  fields: FormPair[];
};

function emptyPair(): FormPair {
  return { id: nextCustomFieldKey(), key: "", value: "" };
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    enabled: true,
    logo_url: null,
    fields: [emptyPair()],
  };
}

function formFromMethod(method: PaymentGatewayMethod): FormState {
  return {
    name: method.name,
    description: method.description ?? "",
    enabled: method.enabled,
    logo_url: method.logo_url,
    fields:
      method.fields.length > 0
        ? method.fields.map((field) => ({
            id: field.key,
            key: field.key,
            value: field.value,
          }))
        : [emptyPair()],
  };
}

function isAllowedLogoType(file: File) {
  return ["image/jpeg", "image/png", "image/webp", "image/x-webp"].includes(file.type);
}

export function PaymentMethodFormSheet({
  open,
  onOpenChange,
  copy,
  existingMethods,
  method = null,
  onSubmit,
}: PaymentMethodFormSheetProps) {
  const isEdit = Boolean(method);
  const formCopy = copy.form;
  const formId = "payment-method-form";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [kind, setKind] = useState<PaymentGatewayKind>("custom");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setKind("custom");
      setLogoFile(null);
      setLogoPreview(null);
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setForm(method ? formFromMethod(method) : emptyForm());
    setKind(method?.kind ?? "custom");
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, method]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function handleKindChange(nextKind: PaymentGatewayKind) {
    setKind(nextKind);
    const preset = createPaymentGatewayMethod(nextKind);
    setForm((current) => ({
      ...current,
      name: preset.name,
      description: preset.description ?? "",
      fields:
        preset.fields.length > 0
          ? preset.fields.map((field) => ({
              id: field.key,
              key: field.key,
              value: "",
            }))
          : [emptyPair()],
    }));
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePair(id: string, patch: Partial<Pick<FormPair, "key" | "value">>) {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  }

  function fieldValueByKey(key: string) {
    return form.fields.find((field) => field.key === key)?.value ?? "";
  }

  function setFieldValueByKey(key: string, value: string) {
    setForm((current) => {
      const existing = current.fields.some((field) => field.key === key);
      if (existing) {
        return {
          ...current,
          fields: current.fields.map((field) =>
            field.key === key ? { ...field, value } : field,
          ),
        };
      }
      return {
        ...current,
        fields: [
          ...current.fields.filter((field) => field.key.trim()),
          { id: key, key, value },
        ],
      };
    });
  }

  function addPair() {
    setForm((current) => ({
      ...current,
      fields: [...current.fields, emptyPair()],
    }));
  }

  function removePair(id: string) {
    setForm((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== id),
    }));
  }

  function handleLogoSelected(file: File | null) {
    if (!file) return;

    if (!isAllowedLogoType(file)) {
      showErrorToast({
        title: copy.toast.requiredField.title,
        description: formCopy.logoInvalid,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > PAYMENT_METHOD_LOGO_MAX_BYTES) {
      showErrorToast({
        title: copy.toast.requiredField.title,
        description: formCopy.logoTooLarge,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLogoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setLogoFile(file);
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    updateForm("logo_url", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const previewSrc =
    logoPreview ??
    methodLogoSrc({ kind, logo_url: form.logo_url, id: method?.id });
  const hasLogo = Boolean(previewSrc);
  const isStripe = kind === "stripe";
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/+$/,
    "",
  );
  const stripeWebhookUrl = `${apiBase || "http://localhost:4000"}/api/webhooks/stripe`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      showErrorToast({
        title: copy.toast.nameRequired.title,
        description: copy.toast.nameRequired.description,
      });
      return;
    }

    const filledPairs = form.fields.filter((field) => field.key.trim() || field.value.trim());
    const fields: PaymentGatewayField[] = [];
    const seenKeys = new Set<string>();

    for (const pair of filledPairs) {
      const normalized = normalizePaymentField(pair.key, pair.value);
      if (!normalized) {
        showErrorToast({
          title: copy.toast.requiredField.title,
          description: formCopy.fieldKeyRequired,
        });
        return;
      }
      if (seenKeys.has(normalized.key)) {
        showErrorToast({
          title: copy.toast.requiredField.title,
          description: formCopy.duplicateFieldKey,
        });
        return;
      }
      seenKeys.add(normalized.key);
      fields.push(normalized);
    }

    const looksLikeStripe =
      kind === "stripe" ||
      fields.some((field) => field.key === "secret_key" && field.value.trim().startsWith("sk_"));
    const nextKind: PaymentGatewayKind = looksLikeStripe ? "stripe" : kind;

    if (!isEdit && nextKind === "stripe" && existingMethods.some((item) => item.kind === "stripe" || item.id === "stripe")) {
      showErrorToast({
        title: copy.toast.duplicatePreset.title,
        description: copy.toast.duplicatePreset.description,
      });
      return;
    }

    setSubmitting(true);
    try {
      const logoUrl = logoFile ? await uploadPaymentMethodLogo(logoFile) : form.logo_url;
      const nextMethod = createPaymentGatewayMethod(nextKind, {
        id: nextKind === "stripe" ? "stripe" : method?.id,
        name,
        description: form.description.trim() || null,
        enabled: form.enabled,
        sort_order: method?.sort_order ?? existingMethods.length,
        logo_url: logoUrl,
        fields,
      });

      if (nextMethod.enabled && !hasRequiredDetails(nextMethod)) {
        showErrorToast({
          title: copy.toast.requiredField.title,
          description:
            nextKind === "stripe"
              ? formatMessage(copy.toast.requiredField.description, {
                  field: formCopy.stripeSecretKey,
                })
              : formCopy.detailsRequired,
        });
        return;
      }

      await onSubmit(nextMethod);
      onOpenChange(false);
    } catch (err) {
      showErrorToast({
        title: copy.toast.updateFailed.title,
        description: err instanceof Error ? err.message : copy.toast.updateFailed.description,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>
            {isEdit ? formCopy.editTitle : formCopy.createTitle}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {isEdit ? formCopy.editDescription : formCopy.createDescription}
          </SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={(event) => void handleSubmit(event)} className="space-y-6 px-6 py-5">
          <section className="space-y-4">
            <AdminSelectField
              id="payment-method-kind"
              label={formCopy.kind}
              hint={isStripe ? formCopy.stripeHint : formCopy.kindHint}
              value={kind}
              disabled={submitting || (isEdit && kind === "stripe")}
              items={PAYMENT_GATEWAY_KINDS.map((item) => ({
                value: item,
                label: copy.kinds[item],
              }))}
              onValueChange={(value) => {
                if (value === "stripe" || value === "custom") {
                  handleKindChange(value);
                }
              }}
            />

            {isStripe ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className={cn("text-sm font-semibold", adminHeadingClass)}>
                    {formCopy.stripeDetailsTitle}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {formCopy.stripeDetailsHint}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-secret-key">{formCopy.stripeSecretKey}</Label>
                  <Input
                    id="stripe-secret-key"
                    type="password"
                    value={fieldValueByKey("secret_key")}
                    onChange={(event) => setFieldValueByKey("secret_key", event.target.value)}
                    placeholder={formCopy.stripeSecretKeyPlaceholder}
                    className={adminInputClass}
                    disabled={submitting}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                  <p className="text-xs leading-relaxed text-slate-500">
                    {formCopy.stripeSecretKeyHint}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook-secret">{formCopy.stripeWebhookSecret}</Label>
                  <Input
                    id="stripe-webhook-secret"
                    type="password"
                    value={fieldValueByKey("webhook_secret")}
                    onChange={(event) => setFieldValueByKey("webhook_secret", event.target.value)}
                    placeholder={formCopy.stripeWebhookSecretPlaceholder}
                    className={adminInputClass}
                    disabled={submitting}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                  <p className="text-xs leading-relaxed text-slate-500">
                    {formCopy.stripeWebhookSecretHint}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook-url">{formCopy.stripeWebhookUrl}</Label>
                  <Input
                    id="stripe-webhook-url"
                    value={stripeWebhookUrl}
                    readOnly
                    className={cn(adminInputClass, "font-mono text-xs")}
                  />
                  <p className="text-xs leading-relaxed text-slate-500">
                    {formCopy.stripeWebhookUrlHint}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="payment-method-name">{copy.fields.name}</Label>
              <Input
                id="payment-method-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder={copy.placeholders.name}
                className={adminInputClass}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method-description">{copy.fields.description}</Label>
              <Input
                id="payment-method-description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder={copy.placeholders.description}
                className={adminInputClass}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label>{copy.fields.logo}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={PAYMENT_METHOD_LOGO_ACCEPT}
                className="hidden"
                onChange={(event) => handleLogoSelected(event.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white transition",
                    submitting
                      ? "cursor-not-allowed opacity-70"
                      : "hover:border-[#C9B87A]/80 hover:bg-[#C9B87A]/5",
                  )}
                  aria-label={hasLogo ? formCopy.logoReplace : formCopy.logoUpload}
                >
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="" className="max-h-10 max-w-10 object-contain" />
                  ) : (
                    <ImageIcon className="size-5 text-slate-300" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-slate-200"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                    >
                      <Upload className="size-3.5" />
                      {hasLogo ? formCopy.logoReplace : formCopy.logoUpload}
                    </Button>
                    {hasLogo ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-slate-500 hover:text-red-600"
                        onClick={removeLogo}
                        disabled={submitting}
                      >
                        {formCopy.logoRemove}
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formCopy.logoHint}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <Label htmlFor="payment-method-enabled" className="text-sm font-medium text-slate-700">
                  {copy.fields.enabled}
                </Label>
              </div>
              <Switch
                id="payment-method-enabled"
                checked={form.enabled}
                onCheckedChange={(enabled) => updateForm("enabled", enabled)}
                disabled={submitting}
                aria-label={copy.fields.enabled}
              />
            </div>
          </section>

          {isStripe ? null : (
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", adminHeadingClass)}>
                  {copy.fields.details}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {formCopy.detailsHint}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 border-slate-200"
                onClick={addPair}
                disabled={submitting}
              >
                <Plus className="size-3.5" />
                {copy.actions.addField}
              </Button>
            </div>

            {form.fields.length === 0 ? (
              <button
                type="button"
                onClick={addPair}
                disabled={submitting}
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-[#f8fafb] px-4 py-8 text-center transition hover:border-[#C9B87A]/70 hover:bg-[#C9B87A]/5"
              >
                <Plus className="size-4 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-600">{copy.actions.addField}</p>
                <p className="mt-1 text-xs text-slate-400">{formCopy.emptyDetails}</p>
              </button>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_2rem] gap-2 border-b border-slate-100 bg-[#f8fafb] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {copy.fields.fieldKey}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {copy.fields.fieldValue}
                  </p>
                  <span />
                </div>
                <div className="divide-y divide-slate-100">
                  {form.fields.map((field) => {
                    const slug = slugifyPaymentFieldKey(field.key);
                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_2rem] items-start gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0 space-y-1">
                          <Input
                            value={field.key}
                            onChange={(event) => updatePair(field.id, { key: event.target.value })}
                            placeholder={copy.placeholders.fieldKey}
                            className={cn(adminInputClass, "h-9 font-mono text-xs")}
                            disabled={submitting}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          {slug && slug !== field.key.trim() ? (
                            <p className="truncate font-mono text-[10px] text-slate-400">{slug}</p>
                          ) : null}
                        </div>
                        <Input
                          value={field.value}
                          onChange={(event) => updatePair(field.id, { value: event.target.value })}
                          placeholder={copy.placeholders.fieldValue}
                          className={cn(adminInputClass, "h-9")}
                          disabled={submitting}
                          autoComplete="off"
                          type={isSecretPaymentFieldKey(field.key) ? "password" : "text"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-1 text-slate-400 hover:text-red-600"
                          onClick={() => removePair(field.id)}
                          disabled={submitting}
                          aria-label={copy.actions.remove}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
          )}
        </form>

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200"
          >
            {formCopy.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting}
            className={adminPrimaryButtonClass}
          >
            {submitting
              ? isEdit
                ? formCopy.saving
                : formCopy.creating
              : isEdit
                ? formCopy.save
                : formCopy.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
