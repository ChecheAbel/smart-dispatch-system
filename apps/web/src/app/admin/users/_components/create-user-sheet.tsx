"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Ban,
  CheckCircle2,
  Clock3,
  IdCard,
  ImagePlus,
  KeyRound,
  Mail,
  PauseCircle,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountActivation, AccountStatus, Role, User } from "@smart-dispatch/types";
import { fetchRoles } from "@/lib/role-api";
import { createUser, fetchUserById, fetchUserRoles, setUserRoles, updateUser, upsertUserDriverProfile } from "@/lib/user-api";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  formatEthiopianMobileNumber,
  isValidEthiopianMobileLocal,
  parseStoredEthiopianMobile,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import {
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import { getAdminUsersMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { isValidDriverLicenseNumber, normalizeDriverLicenseNumber } from "@/lib/driver-license";
import {
  DRIVER_LICENSE_PHOTO_ACCEPT,
  getDriverLicensePhotoUrl,
  validateDriverLicensePhoto,
} from "@/lib/driver-license-photo";
import { UserRequesterProfileSection } from "./user-requester-profile-section";

type UserFormSheetMode = "create" | "edit";

type CreateUserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: UserFormSheetMode;
  userId?: string | null;
  onSuccess?: () => void;
};

type UserFormState = {
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mobile: string;
  accountStatus: AccountStatus;
  accountActivation: AccountActivation;
};

type FieldErrors = Partial<
  Record<keyof UserFormState | "licenseNumber" | "licenseFront" | "licenseBack", string>
>;

const emptyForm: UserFormState = {
  email: "",
  password: "",
  firstName: "",
  middleName: "",
  lastName: "",
  mobile: "",
  accountStatus: "active",
  accountActivation: "pending",
};

function mapUserToForm(user: User): UserFormState {
  return {
    email: user.email,
    password: "",
    firstName: user.first_name,
    middleName: user.middle_name ?? "",
    lastName: user.last_name,
    mobile: parseStoredEthiopianMobile(user.mobile_number),
    accountStatus: user.account_status,
    accountActivation: user.account_activation,
  };
}

const fieldClassName = adminInputClass;
const selectTriggerClassName = cn(fieldClassName, "w-full");
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

const ACCOUNT_STATUS_OPTIONS: {
  value: AccountStatus;
  icon: LucideIcon;
  iconClassName: string;
}[] = [
  { value: "active", icon: CheckCircle2, iconClassName: "text-emerald-700" },
  { value: "suspended", icon: PauseCircle, iconClassName: "text-amber-700" },
  { value: "deactivated", icon: Ban, iconClassName: "text-slate-600" },
];

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Mail;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={adminIconBoxClass}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className={cn("text-sm font-semibold", adminHeadingClass)}>{title}</p>
        <p className="text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function RolesSkeleton() {
  return <Skeleton className="h-10 w-full rounded-lg" />;
}

function LicensePhotoField({
  id,
  label,
  hint,
  previewUrl,
  fileName,
  error,
  disabled,
  replaceLabel,
  canRemove = true,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  previewUrl: string | null;
  fileName?: string | null;
  error?: string;
  disabled?: boolean;
  replaceLabel: string;
  canRemove?: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={error ? "text-red-700" : undefined}>
        {label}
      </Label>
      <div
        className={cn(
          "rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4",
          error && "border-red-300 bg-red-50/60",
        )}
      >
        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={label} className="max-h-48 w-full object-contain" />
              {canRemove ? (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  disabled={disabled}
                  className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition-colors hover:text-[#1C3A34]"
                  aria-label={`Remove ${label}`}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            {fileName ? <p className="text-xs text-slate-500">{fileName}</p> : null}
            <label
              htmlFor={`${id}-replace`}
              className="inline-flex cursor-pointer text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A]"
            >
              {replaceLabel}
            </label>
            <input
              id={`${id}-replace`}
              type="file"
              accept={DRIVER_LICENSE_PHOTO_ACCEPT}
              className="sr-only"
              disabled={disabled}
              onChange={(event) => {
                onChange(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </div>
        ) : (
          <label htmlFor={id} className="flex cursor-pointer flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#1C3A34]/8 text-[#1C3A34]">
              <ImagePlus className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1C3A34]">{label}</p>
              <p className="text-xs text-slate-500">{hint}</p>
            </div>
            <input
              id={id}
              type="file"
              accept={DRIVER_LICENSE_PHOTO_ACCEPT}
              className="sr-only"
              disabled={disabled}
              onChange={(event) => {
                onChange(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function CreateUserSheet({
  open,
  onOpenChange,
  mode = "create",
  userId = null,
  onSuccess,
}: CreateUserSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminUsersMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [loadedUser, setLoadedUser] = useState<User | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [licenseFrontPreview, setLicenseFrontPreview] = useState<string | null>(null);
  const [licenseBackPreview, setLicenseBackPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      setAllRoles([]);
      setSelectedRoleId(null);
      setRolesLoading(false);
      setLoadedUser(null);
      setLicenseNumber("");
      setLicenseFrontFile(null);
      setLicenseBackFile(null);
      setLicenseFrontPreview(null);
      setLicenseBackPreview(null);
      return;
    }

    let cancelled = false;

    async function loadSheetData() {
      setRolesLoading(true);

      try {
        const rolesResult = await fetchRoles({ page: 1, limit: 100, locale });
        if (cancelled) {
          return;
        }

        setAllRoles(rolesResult.data);

        if (!isEdit) {
          setForm(emptyForm);
          setSelectedRoleId(null);
          setLoadedUser(null);
          setLicenseNumber("");
          setLicenseFrontFile(null);
          setLicenseBackFile(null);
          setLicenseFrontPreview(null);
          setLicenseBackPreview(null);
          return;
        }

        if (!userId) {
          return;
        }

        setLoading(true);
        setError(null);

        const [user, assignedRoles] = await Promise.all([
          fetchUserById(userId),
          fetchUserRoles(userId, locale),
        ]);

        if (!cancelled) {
          setForm(mapUserToForm(user));
          setLoadedUser(user);
          setSelectedRoleId(assignedRoles[0]?.id ?? null);
          setLicenseNumber(user.driver?.license_number ?? "");
          setLicenseFrontFile(null);
          setLicenseBackFile(null);
          setLicenseFrontPreview(getDriverLicensePhotoUrl(user.driver?.license_photo_url));
          setLicenseBackPreview(getDriverLicensePhotoUrl(user.driver?.license_photo_back_url));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : formCopy.errors.loadFailed;
          setError(message);
          showErrorToast({
            title: toastCopy.loadFailed.title,
            description: message,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRolesLoading(false);
        }
      }
    }

    void loadSheetData();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    isEdit,
    userId,
    locale,
    formCopy.errors.loadFailed,
    toastCopy.loadFailed.title,
    toastCopy.loadFailed.description,
  ]);

  const roleItems = useMemo(
    () => [
      { label: formCopy.roleNoneOption, value: null },
      ...allRoles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    ],
    [allRoles, formCopy.roleNoneOption],
  );

  const selectedRole = allRoles.find((role) => role.id === selectedRoleId) ?? null;
  const isDriverRole = selectedRole?.slug === "driver";
  const existingFrontUrl = getDriverLicensePhotoUrl(loadedUser?.driver?.license_photo_url);
  const existingBackUrl = getDriverLicensePhotoUrl(loadedUser?.driver?.license_photo_back_url);

  useEffect(() => {
    if (!licenseFrontFile) return;
    const url = URL.createObjectURL(licenseFrontFile);
    setLicenseFrontPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [licenseFrontFile]);

  useEffect(() => {
    if (!licenseBackFile) return;
    const url = URL.createObjectURL(licenseBackFile);
    setLicenseBackPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [licenseBackFile]);

  function updateField<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const email = form.email.trim();
    const password = form.password;
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const mobile = sanitizeEthiopianMobileInput(form.mobile);
    const errors: FieldErrors = {};

    if (!email) {
      errors.email = formCopy.errors.emailRequired;
    }

    if (!isEdit) {
      if (!password) {
        errors.password = formCopy.errors.passwordRequired;
      } else if (password.length < 8) {
        errors.password = formCopy.errors.passwordMinLength;
      }
    }

    if (!firstName) {
      errors.firstName = formCopy.errors.firstNameRequired;
    }

    if (!lastName) {
      errors.lastName = formCopy.errors.lastNameRequired;
    }

    if (!mobile) {
      errors.mobile = formCopy.errors.mobileRequired;
    } else if (!isValidEthiopianMobileLocal(mobile)) {
      errors.mobile = formCopy.errors.mobileInvalid;
    }

    if (isDriverRole) {
      if (!isValidDriverLicenseNumber(licenseNumber)) {
        errors.licenseNumber = formCopy.errors.licenseRequired;
      }

      const frontError = validateDriverLicensePhoto(licenseFrontFile, {
        required: !isEdit || !existingFrontUrl,
        requiredMessage: formCopy.errors.licenseFrontRequired,
      });
      if (frontError) {
        errors.licenseFront = frontError === formCopy.errors.licenseFrontRequired
          ? frontError
          : formCopy.errors.licensePhotoInvalid;
      }

      const backError = validateDriverLicensePhoto(licenseBackFile, {
        required: !isEdit || !existingBackUrl,
        requiredMessage: formCopy.errors.licenseBackRequired,
      });
      if (backError) {
        errors.licenseBack = backError === formCopy.errors.licenseBackRequired
          ? backError
          : formCopy.errors.licensePhotoInvalid;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const mobileNumber = formatEthiopianMobileNumber(mobile);

    setSubmitting(true);

    try {
      const roleIds = selectedRoleId ? [selectedRoleId] : [];

      if (isEdit && userId) {
        await updateUser(userId, {
          email,
          first_name: firstName,
          middle_name: form.middleName.trim() || null,
          last_name: lastName,
          mobile_number: mobileNumber,
          account_status: form.accountStatus,
          account_activation: form.accountActivation,
        });
        await setUserRoles(userId, roleIds, locale);
        if (isDriverRole) {
          await upsertUserDriverProfile(userId, {
            driver_license_number: normalizeDriverLicenseNumber(licenseNumber),
            driver_license_photo_front: licenseFrontFile,
            driver_license_photo_back: licenseBackFile,
          });
        }
        showSuccessToast(toastCopy.updateSuccess);
      } else {
        const user = await createUser({
          email,
          password,
          first_name: firstName,
          middle_name: form.middleName.trim() || null,
          last_name: lastName,
          mobile_number: mobileNumber,
          account_status: form.accountStatus,
          account_activation: form.accountActivation,
        });
        if (roleIds.length > 0) {
          await setUserRoles(user.id, roleIds, locale);
        }
        if (isDriverRole) {
          await upsertUserDriverProfile(user.id, {
            driver_license_number: normalizeDriverLicenseNumber(licenseNumber),
            driver_license_photo_front: licenseFrontFile,
            driver_license_photo_back: licenseBackFile,
          });
        }
        showSuccessToast(toastCopy.createSuccess);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const failedCopy = isEdit ? toastCopy.updateFailed : toastCopy.createFailed;
      const message = err instanceof Error ? err.message : failedCopy.description;
      setError(message);
      showErrorToast({
        title: failedCopy.title,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "user-form-sheet";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>
            {isEdit ? formCopy.editTitle : formCopy.createTitle}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {isEdit ? formCopy.editDescription : formCopy.createDescription}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="px-6 py-8 text-sm text-slate-500">{formCopy.loading}</div>
        ) : (
          <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <SectionHeader
                icon={Mail}
                title={formCopy.accountSection}
                description={formCopy.accountSectionDescription}
              />
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email" className={fieldErrors.email ? "text-red-700" : undefined}>
                    {formCopy.email}
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder={formCopy.emailPlaceholder}
                    className={cn(fieldClassName, fieldErrors.email && fieldErrorClassName)}
                    autoComplete="off"
                  />
                  {fieldErrors.email ? (
                    <p className="text-xs text-red-600">{fieldErrors.email}</p>
                  ) : null}
                </div>

                {!isEdit ? (
                  <div className="space-y-2">
                    <Label htmlFor="user-password" className={fieldErrors.password ? "text-red-700" : undefined}>
                      {formCopy.password}
                    </Label>
                    <Input
                      id="user-password"
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder={formCopy.passwordPlaceholder}
                      className={cn(fieldClassName, fieldErrors.password && fieldErrorClassName)}
                      autoComplete="new-password"
                    />
                    {fieldErrors.password ? (
                      <p className="text-xs text-red-600">{fieldErrors.password}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <SectionHeader
                icon={UserRound}
                title={formCopy.profileSection}
                description={formCopy.profileSectionDescription}
              />
              <Separator />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="user-first-name"
                      className={fieldErrors.firstName ? "text-red-700" : undefined}
                    >
                      {formCopy.firstName}
                    </Label>
                    <Input
                      id="user-first-name"
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      placeholder={formCopy.firstNamePlaceholder}
                      className={cn(fieldClassName, fieldErrors.firstName && fieldErrorClassName)}
                    />
                    {fieldErrors.firstName ? (
                      <p className="text-xs text-red-600">{fieldErrors.firstName}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="user-last-name"
                      className={fieldErrors.lastName ? "text-red-700" : undefined}
                    >
                      {formCopy.lastName}
                    </Label>
                    <Input
                      id="user-last-name"
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      placeholder={formCopy.lastNamePlaceholder}
                      className={cn(fieldClassName, fieldErrors.lastName && fieldErrorClassName)}
                    />
                    {fieldErrors.lastName ? (
                      <p className="text-xs text-red-600">{fieldErrors.lastName}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-middle-name">
                    {formCopy.middleName}{" "}
                    <span className="font-normal text-slate-500">{formCopy.optional}</span>
                  </Label>
                  <Input
                    id="user-middle-name"
                    value={form.middleName}
                    onChange={(event) => updateField("middleName", event.target.value)}
                    placeholder={formCopy.middleNamePlaceholder}
                    className={fieldClassName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-mobile" className={fieldErrors.mobile ? "text-red-700" : undefined}>
                    {formCopy.mobile}
                  </Label>
                  <div
                    className={cn(
                      "flex overflow-hidden rounded-lg border bg-white shadow-sm",
                      fieldErrors.mobile
                        ? "border-red-300 ring-2 ring-red-200/60"
                        : "border-slate-200 focus-within:border-[#1C3A34] focus-within:ring-2 focus-within:ring-[#1C3A34]/15",
                    )}
                  >
                    <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                      <span aria-hidden className="text-base leading-none">
                        🇪🇹
                      </span>
                      <span className="font-semibold tabular-nums">{ETHIOPIA_MOBILE_COUNTRY_CODE}</span>
                    </div>
                    <Input
                      id="user-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={form.mobile}
                      onChange={(event) => updateField("mobile", sanitizeEthiopianMobileInput(event.target.value))}
                      placeholder={formCopy.mobilePlaceholder}
                      className={cn(
                        fieldClassName,
                        "rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
                        fieldErrors.mobile && fieldErrorClassName,
                      )}
                      aria-invalid={Boolean(fieldErrors.mobile)}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{formCopy.mobileHelp}</p>
                  {fieldErrors.mobile ? (
                    <p className="text-xs text-red-600">{fieldErrors.mobile}</p>
                  ) : null}
                </div>
              </div>
            </section>

            {isEdit && loadedUser?.requester_profile ? (
              <UserRequesterProfileSection user={loadedUser} />
            ) : null}

            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <SectionHeader
                icon={KeyRound}
                title={formCopy.accessSection}
                description={formCopy.accessSectionDescription}
              />
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-account-status">{formCopy.accountStatus}</Label>
                  <Select
                    items={ACCOUNT_STATUS_OPTIONS.map((option) => ({
                      label: copy.status[option.value],
                      value: option.value,
                    }))}
                    value={form.accountStatus}
                    onValueChange={(value) => {
                      if (value) updateField("accountStatus", value as AccountStatus);
                    }}
                    disabled={submitting}
                  >
                    <SelectTrigger id="user-account-status" className={selectTriggerClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ACCOUNT_STATUS_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <Icon className={cn("size-4", option.iconClassName)} />
                              {copy.status[option.value]}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {formCopy.statusDescriptions[form.accountStatus]}
                  </p>
                </div>

                <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className={cn(adminIconBoxClass, "shrink-0")}>
                    {form.accountActivation === "activated" ? (
                      <CheckCircle2 className="size-4 text-emerald-700" />
                    ) : (
                      <Clock3 className="size-4 text-sky-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn("text-sm font-semibold", adminHeadingClass)}>
                      {formCopy.activationTitle}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {form.accountActivation === "activated"
                        ? formCopy.activationOn
                        : formCopy.activationOff}
                    </p>
                  </div>
                  <Switch
                    id="user-account-activation"
                    className="shrink-0"
                    checked={form.accountActivation === "activated"}
                    onCheckedChange={(checked) =>
                      updateField("accountActivation", checked ? "activated" : "pending")
                    }
                    disabled={submitting}
                    aria-label={formCopy.activationTitle}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <SectionHeader
                icon={Shield}
                title={formCopy.rolesSection}
                description={formCopy.rolesSectionDescription}
              />
              <Separator />
              {rolesLoading ? (
                <RolesSkeleton />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="user-role">{copy.columns.roles}</Label>
                  <Select
                    items={roleItems}
                    value={selectedRoleId}
                    onValueChange={(value) => setSelectedRoleId(value)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="user-role" className={selectTriggerClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roleItems.map((item) => (
                          <SelectItem key={item.value ?? "none"} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </section>

            {isDriverRole ? (
              <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
                <SectionHeader
                  icon={IdCard}
                  title={formCopy.driverSection}
                  description={formCopy.driverSectionDescription}
                />
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="user-license-number"
                      className={fieldErrors.licenseNumber ? "text-red-700" : undefined}
                    >
                      {formCopy.licenseNumber}
                    </Label>
                    <Input
                      id="user-license-number"
                      value={licenseNumber}
                      onChange={(event) => {
                        setLicenseNumber(event.target.value.toUpperCase());
                        setFieldErrors((current) => {
                          if (!current.licenseNumber) return current;
                          const next = { ...current };
                          delete next.licenseNumber;
                          return next;
                        });
                      }}
                      placeholder={formCopy.licenseNumberPlaceholder}
                      className={cn(fieldClassName, fieldErrors.licenseNumber && fieldErrorClassName)}
                      autoComplete="off"
                    />
                    <p className="text-xs text-slate-500">{formCopy.licenseNumberHelp}</p>
                    {fieldErrors.licenseNumber ? (
                      <p className="text-xs text-red-600">{fieldErrors.licenseNumber}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LicensePhotoField
                      id="user-license-front"
                      label={formCopy.licenseFront}
                      hint={formCopy.licensePhotoHint}
                      previewUrl={licenseFrontFile ? licenseFrontPreview : existingFrontUrl}
                      fileName={licenseFrontFile?.name}
                      error={fieldErrors.licenseFront}
                      disabled={submitting}
                      replaceLabel={formCopy.licensePhotoReplace}
                      canRemove={Boolean(licenseFrontFile)}
                      onChange={(file) => {
                        setLicenseFrontFile(file);
                        if (!file) {
                          setLicenseFrontPreview(null);
                        }
                        setFieldErrors((current) => {
                          if (!current.licenseFront) return current;
                          const next = { ...current };
                          delete next.licenseFront;
                          return next;
                        });
                      }}
                    />
                    <LicensePhotoField
                      id="user-license-back"
                      label={formCopy.licenseBack}
                      hint={formCopy.licensePhotoHint}
                      previewUrl={licenseBackFile ? licenseBackPreview : existingBackUrl}
                      fileName={licenseBackFile?.name}
                      error={fieldErrors.licenseBack}
                      disabled={submitting}
                      replaceLabel={formCopy.licensePhotoReplace}
                      canRemove={Boolean(licenseBackFile)}
                      onChange={(file) => {
                        setLicenseBackFile(file);
                        if (!file) {
                          setLicenseBackPreview(null);
                        }
                        setFieldErrors((current) => {
                          if (!current.licenseBack) return current;
                          const next = { ...current };
                          delete next.licenseBack;
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <SheetFooter className="border-t border-slate-100 px-0 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {formCopy.cancel}
              </Button>
              <Button type="submit" form={formId} className={adminPrimaryButtonClass} disabled={submitting}>
                {submitting
                  ? isEdit
                    ? formCopy.saving
                    : formCopy.creating
                  : isEdit
                    ? formCopy.save
                    : formCopy.create}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
