"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Shield,
  UserRound,
} from "lucide-react";
import type { AccountActivation, AccountStatus, User } from "@smart-dispatch/types";
import { getUserInitials, useAuth, useLocale } from "@/components/shared/providers";
import { AdminField, AdminPasswordField, AdminTextField } from "@/components/shared/admin-form-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  formatEthiopianMobileNumber,
  isValidEthiopianMobileLocal,
  parseStoredEthiopianMobile,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminTheme,
} from "@/lib/admin-theme";
import { changeMyPassword, updateMyProfile } from "@/lib/profile-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminProfileMessages } from "@/translations";
import { cn } from "@/lib/utils";

type ProfileFormState = {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mobile: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileFieldErrors = Partial<Record<keyof ProfileFormState, string>>;
type PasswordFieldErrors = Partial<Record<keyof PasswordFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

const emptyPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function mapUserToProfileForm(user: User): ProfileFormState {
  return {
    email: user.email,
    firstName: user.first_name,
    middleName: user.middle_name ?? "",
    lastName: user.last_name,
    mobile: parseStoredEthiopianMobile(user.mobile_number),
  };
}

function formatUserName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

function formatRoleLabel(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function statusBadgeClass(status: AccountStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "suspended":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "deactivated":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "";
  }
}

function activationBadgeClass(activation: AccountActivation) {
  return activation === "activated"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-sky-200 bg-sky-50 text-sky-800";
}

function ProfileCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: typeof UserRound;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border", adminCardClass, className)}>
      <div className="border-b border-slate-100 bg-[#f8fafb]/60 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#1C3A34]/8 p-2.5 text-[#1C3A34]">
            <Icon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold text-[#1C3A34]">{title}</h2>
            {description ? (
              <p className="text-xs leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ProfileHero({
  user,
  roleLabels,
  accountCopy,
  eyebrow,
}: {
  user: User;
  roleLabels: string[];
  accountCopy: ReturnType<typeof getAdminProfileMessages>["account"];
  eyebrow: string;
}) {
  const displayName = formatUserName(user) || user.email;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#1C3A34]/10 bg-white shadow-sm">
      <div
        className="absolute inset-0 bg-linear-to-br from-[#1C3A34]/8 via-white to-[#C9B87A]/12"
        aria-hidden
      />
      <div
        className="absolute -top-16 -right-16 size-48 rounded-full bg-[#C9B87A]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-20 -left-10 size-40 rounded-full bg-[#1C3A34]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar className="size-20 ring-4 ring-white shadow-md">
          <AvatarFallback
            className="text-xl font-bold text-white"
            style={{ backgroundColor: adminTheme.brand }}
          >
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f7d45]">
              {eyebrow}
            </p>
            <h1 className={cn("mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl", adminHeadingClass)}>
              {displayName}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{user.email}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums">{user.mobile_number}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {roleLabels.length > 0 ? (
              roleLabels.map((role) => (
                <Badge key={role} variant="outline" className={adminBadgeGoldClass}>
                  <Shield className="size-3" />
                  {role}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                {accountCopy.noRoles}
              </Badge>
            )}
            <Badge variant="outline" className={statusBadgeClass(user.account_status)}>
              <CheckCircle2 className="size-3" />
              {accountCopy.status[user.account_status]}
            </Badge>
            <Badge variant="outline" className={activationBadgeClass(user.account_activation)}>
              {accountCopy.activation[user.account_activation]}
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProfilePage() {
  const { locale } = useLocale();
  const { user, updateUser } = useAuth();
  const copy = getAdminProfileMessages(locale);
  const accountCopy = copy.account;

  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => mapUserToProfileForm(user));
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState<PasswordFieldErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const baselineForm = useMemo(() => mapUserToProfileForm(user), [user]);

  useEffect(() => {
    setProfileForm(mapUserToProfileForm(user));
  }, [user]);

  const roleLabels = useMemo(
    () => (user.roles.length > 0 ? user.roles.map(formatRoleLabel) : []),
    [user.roles],
  );

  const hasProfileChanges = useMemo(() => {
    return (
      profileForm.email !== baselineForm.email ||
      profileForm.firstName !== baselineForm.firstName ||
      profileForm.middleName !== baselineForm.middleName ||
      profileForm.lastName !== baselineForm.lastName ||
      profileForm.mobile !== baselineForm.mobile
    );
  }, [baselineForm, profileForm]);

  function updateProfileField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setProfileForm((current) => ({ ...current, [key]: value }));
    setProfileErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updatePasswordField<K extends keyof PasswordFormState>(
    key: K,
    value: PasswordFormState[K],
  ) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
    setPasswordErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function resetProfileForm() {
    setProfileForm(baselineForm);
    setProfileErrors({});
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileErrors({});

    const email = profileForm.email.trim();
    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const mobile = sanitizeEthiopianMobileInput(profileForm.mobile);
    const errors: ProfileFieldErrors = {};

    if (!email) {
      errors.email = copy.profile.errors.emailRequired;
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = copy.profile.errors.emailInvalid;
    }

    if (!firstName) {
      errors.firstName = copy.profile.errors.firstNameRequired;
    }

    if (!lastName) {
      errors.lastName = copy.profile.errors.lastNameRequired;
    }

    if (!mobile) {
      errors.mobile = copy.profile.errors.mobileRequired;
    } else if (!isValidEthiopianMobileLocal(mobile)) {
      errors.mobile = copy.profile.errors.mobileInvalid;
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setSavingProfile(true);

    try {
      const result = await updateMyProfile({
        email,
        first_name: firstName,
        middle_name: profileForm.middleName.trim() || null,
        last_name: lastName,
        mobile_number: formatEthiopianMobileNumber(mobile),
      });

      updateUser(result.user);
      showSuccessToast(copy.toast.profileUpdated);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.toast.profileUpdateFailed.description;
      showErrorToast({
        title: copy.toast.profileUpdateFailed.title,
        description: message,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordErrors({});

    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;
    const errors: PasswordFieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = copy.password.errors.currentRequired;
    }

    if (!newPassword) {
      errors.newPassword = copy.password.errors.newRequired;
    } else if (newPassword.length < 8) {
      errors.newPassword = copy.password.errors.newMinLength;
    }

    if (!confirmPassword) {
      errors.confirmPassword = copy.password.errors.confirmRequired;
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = copy.password.errors.confirmMismatch;
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setSavingPassword(true);

    try {
      await changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordForm(emptyPasswordForm);
      showSuccessToast(copy.toast.passwordUpdated);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.toast.passwordUpdateFailed.description;
      showErrorToast({
        title: copy.toast.passwordUpdateFailed.title,
        description: message,
      });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-500">{copy.description}</p>
      </div>

      <ProfileHero
        user={user}
        roleLabels={roleLabels}
        accountCopy={accountCopy}
        eyebrow={copy.eyebrow}
      />

      <form onSubmit={(event) => void handleProfileSubmit(event)}>
        <ProfileCard
          title={copy.profile.title}
          description={copy.profile.description}
          icon={UserRound}
        >
          <ProfileFormFields
            copy={copy}
            profileForm={profileForm}
            profileErrors={profileErrors}
            savingProfile={savingProfile}
            onFieldChange={updateProfileField}
          />

          <Separator className="my-6" />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-[#f8fafb]"
              disabled={savingProfile || !hasProfileChanges}
              onClick={resetProfileForm}
            >
              {copy.profile.discard}
            </Button>
            <Button
              type="submit"
              className={adminPrimaryButtonClass}
              disabled={savingProfile || !hasProfileChanges}
            >
              {savingProfile ? copy.profile.saving : copy.profile.save}
            </Button>
          </div>
        </ProfileCard>
      </form>

      <ProfileCard
        title={copy.account.title}
        description={copy.account.description}
        icon={Shield}
      >
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200/80 bg-[#f8fafb]/80 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {copy.account.roles}
            </dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">
              {roleLabels.length > 0 ? (
                roleLabels.map((role) => (
                  <Badge key={role} variant="outline" className={adminBadgeGoldClass}>
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-slate-600">{accountCopy.noRoles}</span>
              )}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-[#f8fafb]/80 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {copy.account.statusLabel}
            </dt>
            <dd className="mt-2">
              <Badge variant="outline" className={statusBadgeClass(user.account_status)}>
                {accountCopy.status[user.account_status]}
              </Badge>
            </dd>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-[#f8fafb]/80 p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {copy.account.activationLabel}
            </dt>
            <dd className="mt-2">
              <Badge variant="outline" className={activationBadgeClass(user.account_activation)}>
                {accountCopy.activation[user.account_activation]}
              </Badge>
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#C9B87A]/25 bg-[#C9B87A]/8 px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-[#8f7d45]" aria-hidden />
          <p className="text-xs leading-relaxed text-[#6b5c32]">{copy.account.adminNote}</p>
        </div>
      </ProfileCard>

      <form onSubmit={(event) => void handlePasswordSubmit(event)}>
        <ProfileCard
          title={copy.password.title}
          description={copy.password.description}
          icon={KeyRound}
        >
          <PasswordFields
            copy={copy}
            passwordForm={passwordForm}
            passwordErrors={passwordErrors}
            savingPassword={savingPassword}
            onFieldChange={updatePasswordField}
          />
        </ProfileCard>
      </form>
    </div>
  );
}

function ProfileFormFields({
  copy,
  profileForm,
  profileErrors,
  savingProfile,
  onFieldChange,
}: {
  copy: ReturnType<typeof getAdminProfileMessages>;
  profileForm: ProfileFormState;
  profileErrors: ProfileFieldErrors;
  savingProfile: boolean;
  onFieldChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <AdminTextField
        id="profile-email"
        label={copy.profile.email}
        type="email"
        autoComplete="email"
        value={profileForm.email}
        onChange={(event) => onFieldChange("email", event.target.value)}
        placeholder={copy.profile.emailPlaceholder}
        error={profileErrors.email}
        disabled={savingProfile}
        containerClassName="sm:col-span-2"
      />

      <AdminTextField
        id="profile-first-name"
        label={copy.profile.firstName}
        autoComplete="given-name"
        value={profileForm.firstName}
        onChange={(event) => onFieldChange("firstName", event.target.value)}
        placeholder={copy.profile.firstNamePlaceholder}
        error={profileErrors.firstName}
        disabled={savingProfile}
      />

      <AdminTextField
        id="profile-last-name"
        label={copy.profile.lastName}
        autoComplete="family-name"
        value={profileForm.lastName}
        onChange={(event) => onFieldChange("lastName", event.target.value)}
        placeholder={copy.profile.lastNamePlaceholder}
        error={profileErrors.lastName}
        disabled={savingProfile}
      />

      <AdminTextField
        id="profile-middle-name"
        label={copy.profile.middleName}
        optional
        optionalLabel={copy.profile.optional}
        autoComplete="additional-name"
        value={profileForm.middleName}
        onChange={(event) => onFieldChange("middleName", event.target.value)}
        placeholder={copy.profile.middleNamePlaceholder}
        disabled={savingProfile}
      />

      <AdminField
        label={copy.profile.mobile}
        htmlFor="profile-mobile"
        hint={copy.profile.mobileHelp}
        error={profileErrors.mobile}
      >
        <div
          className={cn(
            "flex overflow-hidden rounded-lg border bg-white shadow-xs focus-within:border-[#1C3A34]/30 focus-within:ring-2 focus-within:ring-[#1C3A34]/10",
            profileErrors.mobile
              ? "border-red-300 ring-2 ring-red-200/60"
              : "border-slate-200",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600",
              profileErrors.mobile && "border-red-200 bg-red-50/60 text-red-700",
            )}
          >
            <Phone className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="font-semibold tabular-nums">{ETHIOPIA_MOBILE_COUNTRY_CODE}</span>
          </div>
          <Input
            id="profile-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={profileForm.mobile}
            onChange={(event) =>
              onFieldChange("mobile", sanitizeEthiopianMobileInput(event.target.value))
            }
            placeholder={copy.profile.mobilePlaceholder}
            disabled={savingProfile}
            aria-invalid={Boolean(profileErrors.mobile)}
            className={cn(
              "rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
              adminInputClass,
              profileErrors.mobile && fieldErrorClassName,
            )}
          />
        </div>
      </AdminField>
    </div>
  );
}

function PasswordFields({
  copy,
  passwordForm,
  passwordErrors,
  savingPassword,
  onFieldChange,
}: {
  copy: ReturnType<typeof getAdminProfileMessages>;
  passwordForm: PasswordFormState;
  passwordErrors: PasswordFieldErrors;
  savingPassword: boolean;
  onFieldChange: <K extends keyof PasswordFormState>(key: K, value: PasswordFormState[K]) => void;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <AdminPasswordField
          id="profile-current-password"
          label={copy.password.current}
          placeholder={copy.password.currentPlaceholder}
          autoComplete="current-password"
          value={passwordForm.currentPassword}
          onChange={(event) => onFieldChange("currentPassword", event.target.value)}
          error={passwordErrors.currentPassword}
          disabled={savingPassword}
          containerClassName="sm:col-span-2"
        />

        <AdminPasswordField
          id="profile-new-password"
          label={copy.password.new}
          placeholder={copy.password.newPlaceholder}
          hint={copy.password.newHint}
          autoComplete="new-password"
          value={passwordForm.newPassword}
          onChange={(event) => onFieldChange("newPassword", event.target.value)}
          error={passwordErrors.newPassword}
          disabled={savingPassword}
        />

        <AdminPasswordField
          id="profile-confirm-password"
          label={copy.password.confirm}
          placeholder={copy.password.confirmPlaceholder}
          autoComplete="new-password"
          value={passwordForm.confirmPassword}
          onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
          error={passwordErrors.confirmPassword}
          disabled={savingPassword}
        />
      </div>

      <Separator className="my-6" />

      <div className="flex justify-end">
        <Button type="submit" className={adminPrimaryButtonClass} disabled={savingPassword}>
          {savingPassword ? copy.password.updating : copy.password.update}
        </Button>
      </div>
    </>
  );
}
