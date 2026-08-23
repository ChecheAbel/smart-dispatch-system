"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import type { PaymentGatewayField, PaymentGatewayMethod } from "@/lib/system-settings-api";
import { uploadPaymentMethodLogo } from "@/lib/system-settings-api";
import { getAdminPaymentGatewaySettingsMessages } from "@/translations";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  createPaymentGatewayMethod,
  hasRequiredDetails,
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setLogoFile(null);
      setLogoPreview(null);
      setError(null);
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setForm(method ? formFromMethod(method) : emptyForm());
    setLogoFile(null);
    setLogoPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, method]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function updatePair(id: string, patch: Partial<Pick<FormPair, "key" | "value">>) {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
    setError(null);
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
    setError(null);
  }

  function handleLogoSelected(file: File | null) {
    if (!file) return;

    if (!isAllowedLogoType(file)) {
      setError(formCopy.logoInvalid);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > PAYMENT_METHOD_LOGO_MAX_BYTES) {
      setError(formCopy.logoTooLarge);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLogoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setLogoFile(file);
    setError(null);
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
    (form.logo_url ? methodLogoSrc({ kind: "custom", logo_url: form.logo_url }) : null);
  const hasLogo = Boolean(previewSrc);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    if (!name) {
      setError(formCopy.nameRequired);
      return;
    }

    const filledPairs = form.fields.filter((field) => field.key.trim() || field.value.trim());
    const fields: PaymentGatewayField[] = [];
    const seenKeys = new Set<string>();

    for (const pair of filledPairs) {
      const normalized = normalizePaymentField(pair.key, pair.value);
      if (!normalized) {
        setError(formCopy.fieldKeyRequired);
        return;
      }
      if (seenKeys.has(normalized.key)) {
        setError(formCopy.duplicateFieldKey);
        return;
      }
      seenKeys.add(normalized.key);
      fields.push(normalized);
    }

    setSubmitting(true);
    try {
      const logoUrl = logoFile ? await uploadPaymentMethodLogo(logoFile) : form.logo_url;
      const nextMethod = createPaymentGatewayMethod("custom", {
        id: method?.id,
        name,
        description: form.description.trim() || null,
        enabled: form.enabled,
        sort_order: method?.sort_order ?? existingMethods.length,
        logo_url: logoUrl,
        fields,
      });

      if (nextMethod.enabled && !hasRequiredDetails(nextMethod)) {
        setError(formCopy.detailsRequired);
        return;
      }

      await onSubmit(nextMethod);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.toast.updateFailed.description);
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

          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", adminHeadingClass)}>{copy.fields.details}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{formCopy.detailsHint}</p>
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

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
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
