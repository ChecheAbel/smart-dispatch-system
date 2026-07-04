"use client";

import { useState, type ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminInputClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

type AdminFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminField({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  optionalLabel = "(optional)",
  children,
  className,
}: AdminFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label
          htmlFor={htmlFor}
          className={cn("text-sm font-medium text-[#1C3A34]", error && "text-red-700")}
        >
          {label}
        </Label>
        {optional ? (
          <span className="shrink-0 text-xs text-slate-400">{optionalLabel}</span>
        ) : null}
      </div>
      {children}
      {hint && !error ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

type AdminTextFieldProps = Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  icon?: LucideIcon;
  containerClassName?: string;
};

export function AdminTextField({
  id,
  label,
  hint,
  error,
  optional,
  optionalLabel,
  icon: Icon,
  containerClassName,
  className,
  disabled,
  ...props
}: AdminTextFieldProps) {
  return (
    <AdminField
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      optional={optional}
      optionalLabel={optionalLabel}
      className={containerClassName}
    >
      <div className="relative">
        {Icon ? (
          <Icon
            className={cn(
              "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2",
              error ? "text-red-400" : "text-slate-400",
            )}
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn(
            adminInputClass,
            Icon && "pl-10",
            error && fieldErrorClassName,
            disabled && "bg-slate-50 text-slate-500",
            className,
          )}
          {...props}
        />
      </div>
    </AdminField>
  );
}

type AdminPasswordFieldProps = Omit<AdminTextFieldProps, "type"> & {
  savedHint?: string;
  showSaved?: boolean;
  revealable?: boolean;
  showLabel?: string;
  hideLabel?: string;
};

export function AdminPasswordField({
  id,
  label,
  hint,
  error,
  optional,
  optionalLabel,
  icon: Icon,
  containerClassName,
  savedHint,
  showSaved = false,
  revealable = true,
  showLabel = "Show value",
  hideLabel = "Hide value",
  placeholder,
  className,
  disabled,
  ...props
}: AdminPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <AdminField
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      optional={optional}
      optionalLabel={optionalLabel}
      className={containerClassName}
    >
      <div className="relative">
        {Icon ? (
          <Icon
            className={cn(
              "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2",
              error ? "text-red-400" : "text-slate-400",
            )}
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          placeholder={showSaved ? savedHint : placeholder}
          className={cn(
            adminInputClass,
            Icon && "pl-10",
            revealable && "pr-10",
            error && fieldErrorClassName,
            disabled && "bg-slate-50 text-slate-500",
            className,
          )}
          {...props}
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-[#1C3A34] disabled:opacity-50"
            aria-label={visible ? hideLabel : showLabel}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
    </AdminField>
  );
}

type AdminSelectFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  value: string | null;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
  disabled?: boolean;
  placeholder?: string;
  containerClassName?: string;
};

export function AdminSelectField({
  id,
  label,
  hint,
  error,
  optional,
  optionalLabel,
  value,
  onValueChange,
  items,
  disabled,
  placeholder,
  containerClassName,
}: AdminSelectFieldProps) {
  return (
    <AdminField
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      optional={optional}
      optionalLabel={optionalLabel}
      className={containerClassName}
    >
      <Select
        items={items}
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(
            adminInputClass,
            "w-full",
            error && fieldErrorClassName,
            disabled && "bg-slate-50 text-slate-500",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </AdminField>
  );
}

type AdminFormSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
};

export function AdminFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: AdminFormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        {Icon ? (
          <div className="rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34]">
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-sm font-semibold text-[#1C3A34]">{title}</h2>
          {description ? (
            <p className="text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
