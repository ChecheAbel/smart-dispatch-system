"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AccountActivation, AccountStatus, RequesterProfile, User } from "@smart-dispatch/types";
import { getUserInitials, useAuth, useLocale } from "@/components/shared/providers";
import { AdminField, AdminPasswordField, AdminTextField } from "@/components/shared/admin-form-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Landmark,
  Phone,
  Shield,
  UserRound,
} from "lucide-react";
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

type RequesterFormState = {
  organizationName: string;
  jobTitle: string;
  organizationAddress: string;
  taxId: string;
  registrationNumber: string;
  governmentEntityType: string;
  officialReference: string;
  billingContactName: string;
  billingContactEmail: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileFieldErrors = Partial<Record<keyof ProfileFormState, string>>;
type RequesterFieldErrors = Partial<Record<keyof RequesterFormState, string>>;
type PasswordFieldErrors = Partial<Record<keyof PasswordFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60 dark:border-red-400/40 dark:bg-red-950/25 dark:text-red-200 dark:placeholder:text-red-300/60";

const emptyPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const emptyRequesterForm: RequesterFormState = {
  organizationName: "",
  jobTitle: "",
  organizationAddress: "",
  taxId: "",
  registrationNumber: "",
  governmentEntityType: "",
  officialReference: "",
  billingContactName: "",
  billingContactEmail: "",
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

function mapRequesterToForm(profile: RequesterProfile | null): RequesterFormState {
  if (!profile) return emptyRequesterForm;
  return {
    organizationName: profile.organization_name ?? "",
    jobTitle: profile.job_title ?? "",
    organizationAddress: profile.organization_address ?? "",
    taxId: profile.tax_id ?? "",
    registrationNumber: profile.registration_number ?? "",
    governmentEntityType: profile.government_entity_type ?? "",
    officialReference: profile.official_reference ?? "",
    billingContactName: profile.billing_contact_name ?? "",
    billingContactEmail: profile.billing_contact_email ?? "",
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

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border", adminCardClass)}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-border sm:px-6">
        <Icon className="size-4 text-[#1C3A34]" />
        <h2 className="text-sm font-semibold text-[#1C3A34]">{title}</h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function ProfilePage() {
  const { locale } = useLocale();
  const { user, updateUser } = useAuth();
  const copy = getAdminProfileMessages(locale);
  const requesterCopy = copy.requester;
  const requesterProfile = user.requester_profile;

  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => mapUserToProfileForm(user));
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [requesterForm, setRequesterForm] = useState<RequesterFormState>(() =>
    mapRequesterToForm(requesterProfile),
  );
  const [requesterErrors, setRequesterErrors] = useState<RequesterFieldErrors>({});
  const [savingRequester, setSavingRequester] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm);
  const [passwordErrors, setPasswordErrors] = useState<PasswordFieldErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const baselineForm = useMemo(() => mapUserToProfileForm(user), [user]);
  const baselineRequesterForm = useMemo(
    () => mapRequesterToForm(user.requester_profile),
    [user.requester_profile],
  );

  useEffect(() => {
    setProfileForm(mapUserToProfileForm(user));
    setRequesterForm(mapRequesterToForm(user.requester_profile));
  }, [user]);

  const roleLabels = useMemo(
    () => (user.roles.length > 0 ? user.roles.map(formatRoleLabel) : []),
    [user.roles],
  );

  const hasProfileChanges = useMemo(
    () =>
      profileForm.email !== baselineForm.email ||
      profileForm.firstName !== baselineForm.firstName ||
      profileForm.middleName !== baselineForm.middleName ||
      profileForm.lastName !== baselineForm.lastName ||
      profileForm.mobile !== baselineForm.mobile,
    [baselineForm, profileForm],
  );

  const hasRequesterChanges = useMemo(
    () =>
      requesterForm.organizationName !== baselineRequesterForm.organizationName ||
      requesterForm.jobTitle !== baselineRequesterForm.jobTitle ||
      requesterForm.organizationAddress !== baselineRequesterForm.organizationAddress ||
      requesterForm.taxId !== baselineRequesterForm.taxId ||
      requesterForm.registrationNumber !== baselineRequesterForm.registrationNumber ||
      requesterForm.governmentEntityType !== baselineRequesterForm.governmentEntityType ||
      requesterForm.officialReference !== baselineRequesterForm.officialReference ||
      requesterForm.billingContactName !== baselineRequesterForm.billingContactName ||
      requesterForm.billingContactEmail !== baselineRequesterForm.billingContactEmail,
    [baselineRequesterForm, requesterForm],
  );

  function updateProfileField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setProfileForm((current) => ({ ...current, [key]: value }));
    setProfileErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateRequesterField<K extends keyof RequesterFormState>(
    key: K,
    value: RequesterFormState[K],
  ) {
    setRequesterForm((current) => ({ ...current, [key]: value }));
    setRequesterErrors((current) => {
      if (!current[key]) return current;
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
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileErrors({});

    const email = profileForm.email.trim();
    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const mobile = sanitizeEthiopianMobileInput(profileForm.mobile);
    const errors: ProfileFieldErrors = {};

    if (!email) errors.email = copy.profile.errors.emailRequired;
    else if (!EMAIL_PATTERN.test(email)) errors.email = copy.profile.errors.emailInvalid;
    if (!firstName) errors.firstName = copy.profile.errors.firstNameRequired;
    if (!lastName) errors.lastName = copy.profile.errors.lastNameRequired;
    if (!mobile) errors.mobile = copy.profile.errors.mobileRequired;
    else if (!isValidEthiopianMobileLocal(mobile)) errors.mobile = copy.profile.errors.mobileInvalid;

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
      showErrorToast({
        title: copy.toast.profileUpdateFailed.title,
        description:
          err instanceof Error ? err.message : copy.toast.profileUpdateFailed.description,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRequesterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requesterProfile) return;

    setRequesterErrors({});
    const errors: RequesterFieldErrors = {};
    const segment = requesterProfile.segment;

    const organizationName = requesterForm.organizationName.trim();
    const jobTitle = requesterForm.jobTitle.trim();
    const organizationAddress = requesterForm.organizationAddress.trim();
    const taxId = requesterForm.taxId.trim();
    const registrationNumber = requesterForm.registrationNumber.trim();
    const governmentEntityType = requesterForm.governmentEntityType.trim();
    const officialReference = requesterForm.officialReference.trim();
    const billingContactName = requesterForm.billingContactName.trim();
    const billingContactEmail = requesterForm.billingContactEmail.trim();

    if (segment === "business" || segment === "government") {
      if (!organizationName) errors.organizationName = requesterCopy.errors.organizationNameRequired;
      if (!jobTitle) errors.jobTitle = requesterCopy.errors.jobTitleRequired;
      if (!organizationAddress) {
        errors.organizationAddress = requesterCopy.errors.organizationAddressRequired;
      }
    }

    if (segment === "business") {
      if (!taxId) errors.taxId = requesterCopy.errors.taxIdRequired;
      if (!registrationNumber) {
        errors.registrationNumber = requesterCopy.errors.registrationNumberRequired;
      }
    }

    if (segment === "government") {
      if (!governmentEntityType) {
        errors.governmentEntityType = requesterCopy.errors.governmentEntityTypeRequired;
      }
      if (!officialReference) {
        errors.officialReference = requesterCopy.errors.officialReferenceRequired;
      }
      if (!billingContactName) {
        errors.billingContactName = requesterCopy.errors.billingContactNameRequired;
      }
      if (!billingContactEmail) {
        errors.billingContactEmail = requesterCopy.errors.billingContactEmailRequired;
      } else if (!EMAIL_PATTERN.test(billingContactEmail)) {
        errors.billingContactEmail = requesterCopy.errors.billingContactEmailInvalid;
      }
    } else if (billingContactEmail && !EMAIL_PATTERN.test(billingContactEmail)) {
      errors.billingContactEmail = requesterCopy.errors.billingContactEmailInvalid;
    }

    if (Object.keys(errors).length > 0) {
      setRequesterErrors(errors);
      return;
    }

    setSavingRequester(true);
    try {
      const result = await updateMyProfile({
        email: user.email,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        mobile_number: user.mobile_number,
        requester_profile: {
          organization_name: organizationName || null,
          job_title: jobTitle || null,
          organization_address: organizationAddress || null,
          tax_id: taxId || null,
          registration_number: registrationNumber || null,
          government_entity_type: governmentEntityType || null,
          official_reference: officialReference || null,
          billing_contact_name: billingContactName || null,
          billing_contact_email: billingContactEmail || null,
        },
      });
      updateUser(result.user);
      showSuccessToast(copy.toast.profileUpdated);
    } catch (err) {
      showErrorToast({
        title: copy.toast.profileUpdateFailed.title,
        description:
          err instanceof Error ? err.message : copy.toast.profileUpdateFailed.description,
      });
    } finally {
      setSavingRequester(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordErrors({});

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const errors: PasswordFieldErrors = {};

    if (!currentPassword) errors.currentPassword = copy.password.errors.currentRequired;
    if (!newPassword) errors.newPassword = copy.password.errors.newRequired;
    else if (newPassword.length < 8) errors.newPassword = copy.password.errors.newMinLength;
    if (!confirmPassword) errors.confirmPassword = copy.password.errors.confirmRequired;
    else if (newPassword && confirmPassword !== newPassword) {
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
      showErrorToast({
        title: copy.toast.passwordUpdateFailed.title,
        description:
          err instanceof Error ? err.message : copy.toast.passwordUpdateFailed.description,
      });
    } finally {
      setSavingPassword(false);
    }
  }

  const displayName = formatUserName(user) || user.email;
  const orgTitle =
    requesterProfile?.segment === "government"
      ? requesterCopy.governmentTitle
      : requesterProfile?.segment === "business"
        ? requesterCopy.businessTitle
        : requesterCopy.individualTitle;
  const OrgIcon =
    requesterProfile?.segment === "government"
      ? Landmark
      : requesterProfile?.segment === "business"
        ? Building2
        : UserRound;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-[var(--brand-primary)] text-lg font-bold text-white">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className={cn("truncate text-xl font-bold", adminHeadingClass)}>{displayName}</h1>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          {requesterProfile ? (
            <Badge variant="outline" className={cn("mt-1.5", adminBadgeGoldClass)}>
              {requesterCopy.segments[requesterProfile.segment]}
            </Badge>
          ) : null}
        </div>
      </div>

      <form onSubmit={(event) => void handleProfileSubmit(event)}>
        <Section title={copy.profile.title} icon={UserRound}>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminTextField
              id="profile-first-name"
              label={copy.profile.firstName}
              value={profileForm.firstName}
              onChange={(event) => updateProfileField("firstName", event.target.value)}
              placeholder={copy.profile.firstNamePlaceholder}
              error={profileErrors.firstName}
              disabled={savingProfile}
            />
            <AdminTextField
              id="profile-last-name"
              label={copy.profile.lastName}
              value={profileForm.lastName}
              onChange={(event) => updateProfileField("lastName", event.target.value)}
              placeholder={copy.profile.lastNamePlaceholder}
              error={profileErrors.lastName}
              disabled={savingProfile}
            />
            <AdminTextField
              id="profile-middle-name"
              label={copy.profile.middleName}
              optional
              optionalLabel={copy.profile.optional}
              value={profileForm.middleName}
              onChange={(event) => updateProfileField("middleName", event.target.value)}
              placeholder={copy.profile.middleNamePlaceholder}
              disabled={savingProfile}
            />
            <AdminTextField
              id="profile-email"
              label={copy.profile.email}
              type="email"
              value={profileForm.email}
              onChange={(event) => updateProfileField("email", event.target.value)}
              placeholder={copy.profile.emailPlaceholder}
              error={profileErrors.email}
              disabled={savingProfile}
            />
            <AdminField
              label={copy.profile.mobile}
              htmlFor="profile-mobile"
              error={profileErrors.mobile}
              className="sm:col-span-2"
            >
              <div
                className={cn(
                  "flex overflow-hidden rounded-lg border bg-white dark:bg-muted/55",
                  profileErrors.mobile
                    ? "border-red-300"
                    : "border-slate-200 dark:border-border",
                )}
              >
                <div className="flex items-center gap-1 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 dark:border-border dark:bg-[#202630]">
                  <Phone className="size-3.5 opacity-70" />
                  <span className="font-semibold">{ETHIOPIA_MOBILE_COUNTRY_CODE}</span>
                </div>
                <Input
                  id="profile-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={profileForm.mobile}
                  onChange={(event) =>
                    updateProfileField("mobile", sanitizeEthiopianMobileInput(event.target.value))
                  }
                  placeholder={copy.profile.mobilePlaceholder}
                  disabled={savingProfile}
                  className={cn(
                    "rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
                    adminInputClass,
                    profileErrors.mobile && fieldErrorClassName,
                  )}
                />
              </div>
            </AdminField>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={savingProfile || !hasProfileChanges}
              onClick={() => {
                setProfileForm(baselineForm);
                setProfileErrors({});
              }}
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
        </Section>
      </form>

      {requesterProfile ? (
        <form onSubmit={(event) => void handleRequesterSubmit(event)}>
          <Section title={orgTitle} icon={OrgIcon}>
            {requesterProfile.segment === "individual" ? (
              <p className="text-sm text-slate-500">{requesterCopy.individualDescription}</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminTextField
                    id="requester-organization-name"
                    label={requesterCopy.organizationName}
                    value={requesterForm.organizationName}
                    onChange={(event) =>
                      updateRequesterField("organizationName", event.target.value)
                    }
                    placeholder={requesterCopy.organizationNamePlaceholder}
                    error={requesterErrors.organizationName}
                    disabled={savingRequester}
                    containerClassName="sm:col-span-2"
                  />
                  <AdminTextField
                    id="requester-job-title"
                    label={requesterCopy.jobTitle}
                    value={requesterForm.jobTitle}
                    onChange={(event) => updateRequesterField("jobTitle", event.target.value)}
                    placeholder={requesterCopy.jobTitlePlaceholder}
                    error={requesterErrors.jobTitle}
                    disabled={savingRequester}
                  />
                  {requesterProfile.segment === "government" ? (
                    <AdminTextField
                      id="requester-entity-type"
                      label={requesterCopy.governmentEntityType}
                      value={requesterForm.governmentEntityType}
                      onChange={(event) =>
                        updateRequesterField("governmentEntityType", event.target.value)
                      }
                      placeholder={requesterCopy.governmentEntityTypePlaceholder}
                      error={requesterErrors.governmentEntityType}
                      disabled={savingRequester}
                    />
                  ) : (
                    <AdminTextField
                      id="requester-tax-id"
                      label={requesterCopy.taxId}
                      value={requesterForm.taxId}
                      onChange={(event) => updateRequesterField("taxId", event.target.value)}
                      placeholder={requesterCopy.taxIdPlaceholder}
                      error={requesterErrors.taxId}
                      disabled={savingRequester}
                    />
                  )}
                  <AdminTextField
                    id="requester-organization-address"
                    label={requesterCopy.organizationAddress}
                    value={requesterForm.organizationAddress}
                    onChange={(event) =>
                      updateRequesterField("organizationAddress", event.target.value)
                    }
                    placeholder={requesterCopy.organizationAddressPlaceholder}
                    error={requesterErrors.organizationAddress}
                    disabled={savingRequester}
                    containerClassName="sm:col-span-2"
                  />
                  {requesterProfile.segment === "business" ? (
                    <AdminTextField
                      id="requester-registration-number"
                      label={requesterCopy.registrationNumber}
                      value={requesterForm.registrationNumber}
                      onChange={(event) =>
                        updateRequesterField("registrationNumber", event.target.value)
                      }
                      placeholder={requesterCopy.registrationNumberPlaceholder}
                      error={requesterErrors.registrationNumber}
                      disabled={savingRequester}
                    />
                  ) : (
                    <AdminTextField
                      id="requester-official-reference"
                      label={requesterCopy.officialReference}
                      value={requesterForm.officialReference}
                      onChange={(event) =>
                        updateRequesterField("officialReference", event.target.value)
                      }
                      placeholder={requesterCopy.officialReferencePlaceholder}
                      error={requesterErrors.officialReference}
                      disabled={savingRequester}
                    />
                  )}
                  <AdminTextField
                    id="requester-billing-contact-name"
                    label={requesterCopy.billingContactName}
                    optional={requesterProfile.segment === "business"}
                    optionalLabel={copy.profile.optional}
                    value={requesterForm.billingContactName}
                    onChange={(event) =>
                      updateRequesterField("billingContactName", event.target.value)
                    }
                    placeholder={requesterCopy.billingContactNamePlaceholder}
                    error={requesterErrors.billingContactName}
                    disabled={savingRequester}
                  />
                  <AdminTextField
                    id="requester-billing-contact-email"
                    label={requesterCopy.billingContactEmail}
                    type="email"
                    optional={requesterProfile.segment === "business"}
                    optionalLabel={copy.profile.optional}
                    value={requesterForm.billingContactEmail}
                    onChange={(event) =>
                      updateRequesterField("billingContactEmail", event.target.value)
                    }
                    placeholder={requesterCopy.billingContactEmailPlaceholder}
                    error={requesterErrors.billingContactEmail}
                    disabled={savingRequester}
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingRequester || !hasRequesterChanges}
                    onClick={() => {
                      setRequesterForm(baselineRequesterForm);
                      setRequesterErrors({});
                    }}
                  >
                    {requesterCopy.discard}
                  </Button>
                  <Button
                    type="submit"
                    className={adminPrimaryButtonClass}
                    disabled={savingRequester || !hasRequesterChanges}
                  >
                    {savingRequester ? requesterCopy.saving : requesterCopy.save}
                  </Button>
                </div>
              </>
            )}
          </Section>
        </form>
      ) : null}

      <Section title={copy.account.title} icon={Shield}>
        <div className="flex flex-wrap gap-2">
          {roleLabels.length > 0 ? (
            roleLabels.map((role) => (
              <Badge key={role} variant="outline" className={adminBadgeGoldClass}>
                {role}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">{copy.account.noRoles}</Badge>
          )}
          <Badge variant="outline" className={statusBadgeClass(user.account_status)}>
            <CheckCircle2 className="size-3" />
            {copy.account.status[user.account_status]}
          </Badge>
          <Badge variant="outline" className={activationBadgeClass(user.account_activation)}>
            {copy.account.activation[user.account_activation]}
          </Badge>
        </div>
      </Section>

      <form onSubmit={(event) => void handlePasswordSubmit(event)}>
        <Section title={copy.password.title} icon={KeyRound}>
          <div className="grid gap-4">
            <AdminPasswordField
              id="profile-current-password"
              label={copy.password.current}
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
              placeholder={copy.password.currentPlaceholder}
              error={passwordErrors.currentPassword}
              disabled={savingPassword}
              autoComplete="current-password"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminPasswordField
                id="profile-new-password"
                label={copy.password.new}
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                placeholder={copy.password.newPlaceholder}
                error={passwordErrors.newPassword}
                disabled={savingPassword}
                autoComplete="new-password"
              />
              <AdminPasswordField
                id="profile-confirm-password"
                label={copy.password.confirm}
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
                placeholder={copy.password.confirmPlaceholder}
                error={passwordErrors.confirmPassword}
                disabled={savingPassword}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="submit" className={adminPrimaryButtonClass} disabled={savingPassword}>
              {savingPassword ? copy.password.updating : copy.password.update}
            </Button>
          </div>
        </Section>
      </form>
    </div>
  );
}
