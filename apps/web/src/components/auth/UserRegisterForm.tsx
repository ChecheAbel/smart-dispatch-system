"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { RequesterSegment } from "@smart-dispatch/types";
import AuthShell from "@/components/auth/AuthShell";
import { AuthBackToHomeLink } from "@/components/auth/AuthBackToHomeLink";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import { useLocale } from "@/components/shared/providers/locale-context";
import { registerUserApplication } from "@/lib/auth-api";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  ETHIOPIAN_MOBILE_PLACEHOLDER,
  formatEthiopianMobileNumber,
  isValidEthiopianMobileLocal,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import { GOVERNMENT_ENTITY_TYPES, REQUESTER_SEGMENT_OPTIONS } from "@/lib/requester-segments";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { isValidEmail } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { formatMessage, getCustomerAuthMessages, type CustomerAuthMessages } from "@/translations";

type RegisterCopy = CustomerAuthMessages["register"];

const inputClassName =
  "w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70";
const plainInputClassName =
  "w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70";
const labelClassName = "block text-xs font-semibold text-slate-600 mb-2.5";
const errorInputClassName =
  "border-red-300 bg-red-50/60 focus:border-red-400 focus:ring-red-200/60";
const errorLabelClassName = "text-red-700";

type FormState = {
  segment: RequesterSegment;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
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

type FieldName = keyof FormState;

type FieldErrors = Partial<Record<FieldName, string>>;

const emptyForm: FormState = {
  segment: "individual",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
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

function firstFieldError(errors: FieldErrors): string | undefined {
  return Object.values(errors).find((message): message is string => Boolean(message));
}

function segmentIcon(segment: RequesterSegment) {
  switch (segment) {
    case "business":
      return Building2;
    case "government":
      return Landmark;
    default:
      return UserRound;
  }
}

function validateBasicInfoStep(form: FormState, errorsCopy: RegisterCopy["errors"]): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) errors.firstName = errorsCopy.firstNameRequired;
  if (!form.lastName.trim()) errors.lastName = errorsCopy.lastNameRequired;

  const email = form.email.trim();
  if (!email) {
    errors.email = errorsCopy.emailRequired;
  } else if (!isValidEmail(email)) {
    errors.email = errorsCopy.emailInvalid;
  }

  if (!form.mobile.trim()) {
    errors.mobile = errorsCopy.mobileRequired;
  } else if (!isValidEthiopianMobileLocal(form.mobile)) {
    errors.mobile = errorsCopy.mobileInvalid;
  }

  if (!form.password) {
    errors.password = errorsCopy.passwordRequired;
  } else if (form.password.length < 8) {
    errors.password = errorsCopy.passwordTooShort;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = errorsCopy.confirmPasswordRequired;
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = errorsCopy.passwordMismatch;
  }

  return errors;
}

function validateOrganizationStep(form: FormState, errorsCopy: RegisterCopy["errors"]): FieldErrors {
  const errors: FieldErrors = {};

  if (form.segment === "business") {
    if (!form.organizationName.trim()) errors.organizationName = errorsCopy.organizationNameRequired;
    if (!form.jobTitle.trim()) errors.jobTitle = errorsCopy.jobTitleRequired;
    if (!form.organizationAddress.trim()) {
      errors.organizationAddress = errorsCopy.organizationAddressRequired;
    }
    if (!form.taxId.trim()) errors.taxId = errorsCopy.taxIdRequired;
    if (!form.registrationNumber.trim()) {
      errors.registrationNumber = errorsCopy.registrationNumberRequired;
    }
  }

  if (form.segment === "government") {
    if (!form.organizationName.trim()) {
      errors.organizationName = errorsCopy.governmentOrgNameRequired;
    }
    if (!form.jobTitle.trim()) errors.jobTitle = errorsCopy.jobTitleRequired;
    if (!form.organizationAddress.trim()) {
      errors.organizationAddress = errorsCopy.organizationAddressRequired;
    }
    if (!form.governmentEntityType.trim()) {
      errors.governmentEntityType = errorsCopy.entityTypeRequired;
    }
    if (!form.officialReference.trim()) {
      errors.officialReference = errorsCopy.officialReferenceRequired;
    }
    if (!form.billingContactName.trim()) {
      errors.billingContactName = errorsCopy.billingContactNameRequired;
    }
    const billingEmail = form.billingContactEmail.trim();
    if (!billingEmail) {
      errors.billingContactEmail = errorsCopy.billingContactEmailRequired;
    } else if (!isValidEmail(billingEmail)) {
      errors.billingContactEmail = errorsCopy.billingContactEmailInvalid;
    }
  }

  return errors;
}

function validateForm(form: FormState, errorsCopy: RegisterCopy["errors"]): FieldErrors {
  return {
    ...validateBasicInfoStep(form, errorsCopy),
    ...validateOrganizationStep(form, errorsCopy),
  };
}

type RegistrationStep = {
  id: "account-type" | "basic-info" | "business-details" | "government-details";
  title: string;
  description: string;
};

function getRegistrationSteps(segment: RequesterSegment, copy: RegisterCopy): RegistrationStep[] {
  const steps: RegistrationStep[] = [
    {
      id: "account-type",
      title: copy.steps.accountType.title,
      description: copy.steps.accountType.description,
    },
    {
      id: "basic-info",
      title: copy.steps.basicInfo.title,
      description: copy.steps.basicInfo.description,
    },
  ];

  if (segment === "business") {
    steps.push({
      id: "business-details",
      title: copy.steps.businessDetails.title,
      description: copy.steps.businessDetails.description,
    });
  } else if (segment === "government") {
    steps.push({
      id: "government-details",
      title: copy.steps.governmentDetails.title,
      description: copy.steps.governmentDetails.description,
    });
  }

  return steps;
}

function validateAccountTypeStep(
  segment: RequesterSegment | null,
  errorsCopy: RegisterCopy["errors"],
): FieldErrors {
  if (!segment) {
    return { segment: errorsCopy.selectAccountType };
  }
  return {};
}

function SegmentBadge({
  segment,
  copy,
}: {
  segment: RequesterSegment;
  copy: RegisterCopy;
}) {
  const Icon = segmentIcon(segment);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1C3A34] text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {copy.accountTypeLabel}
        </p>
        <p className="text-sm font-semibold text-[#1C3A34]">{copy.segments[segment].title}</p>
      </div>
    </div>
  );
}

function StepperHeader({
  steps,
  currentStep,
  stepOfLabel,
}: {
  steps: RegistrationStep[];
  currentStep: number;
  stepOfLabel: string;
}) {
  const step = steps[currentStep];

  return (
    <div className="mb-8 space-y-4 border-b border-slate-100 pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {stepOfLabel}
        </p>
        <p className="text-sm font-semibold text-[#1C3A34]">{step.title}</p>
      </div>

      <div className="flex gap-2">
        {steps.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= currentStep ? "bg-[#1C3A34]" : "bg-slate-200",
            )}
            aria-hidden
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
    </div>
  );
}

function AccountTypeOptionCard({
  segment,
  title,
  description,
  selected,
  disabled,
  onSelect,
}: {
  segment: RequesterSegment;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = segmentIcon(segment);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-[140px] w-full flex-col rounded-2xl border p-5 text-left transition-all",
        selected
          ? "border-[#1C3A34] bg-[#1C3A34]/[0.04] ring-2 ring-[#1C3A34]/15"
          : "border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white",
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-10 w-10 items-center justify-center rounded-xl",
          selected ? "bg-[#1C3A34] text-white" : "bg-white text-slate-400 shadow-sm",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[15px] font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </button>
  );
}

function RegistrationAside({
  copy,
  steps,
  currentStep,
  success = false,
}: {
  copy: RegisterCopy;
  steps?: RegistrationStep[];
  currentStep?: number;
  success?: boolean;
}) {
  if (success) {
    return (
      <div className="space-y-5 border-t border-white/10 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">
          {copy.whatHappensNext}
        </p>
        <ol className="space-y-4">
          {copy.nextSteps.map((text, index) => (
            <li key={text} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C9B87A]/15 text-xs font-bold text-[#C9B87A]">
                {index + 1}
              </span>
              <span className="pt-0.5 text-sm leading-relaxed text-white/60">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!steps || currentStep === undefined) {
    return null;
  }

  return (
    <div className="space-y-6 border-t border-white/10 pt-6">
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">{copy.yourProgress}</p>
        <ol className="space-y-4">
          {steps.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <li
                key={step.id}
                className={cn("flex gap-3", !isComplete && !isCurrent && "opacity-45")}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    isComplete && "bg-[#C9B87A] text-[#1C3A34]",
                    isCurrent && "border-2 border-[#C9B87A] text-[#C9B87A]",
                    !isComplete && !isCurrent && "border border-white/20 text-white/40",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div>
                  <p className={cn("text-sm font-semibold", isCurrent ? "text-white" : "text-white/80")}>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/45">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-semibold text-white/90">{copy.whyRegister}</p>
        <ul className="space-y-3 text-sm text-white/55">
          <li className="flex gap-3">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-[#C9B87A]" />
            {copy.whyRegisterItems[0]}
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C9B87A]" />
            {copy.whyRegisterItems[1]}
          </li>
          <li className="flex gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9B87A]" />
            {copy.whyRegisterItems[2]}
          </li>
        </ul>
      </div>
    </div>
  );
}

function RegistrationShell({
  children,
  copy,
  description,
  aside,
  contentAlign = "start",
  copyright,
}: {
  children: ReactNode;
  copy: RegisterCopy;
  description: string;
  aside?: ReactNode;
  contentAlign?: "center" | "start";
  copyright: string;
}) {
  return (
    <AuthShell
      mobileTitle={copy.mobileTitle}
      desktopEyebrow={copy.desktopEyebrow}
      contentClassName="max-w-xl xl:max-w-2xl"
      contentAlign={contentAlign}
      desktopTitle={
        <>
          {copy.desktopTitlePrefix}{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            {copy.desktopTitleHighlight}
          </span>
        </>
      }
      desktopDescription={description}
      desktopAside={aside}
      footerCopyright={copyright}
      leadingAction={<AuthBackToHomeLink />}
      headerActions={<AuthLanguageSwitcher />}
    >
      {children}
    </AuthShell>
  );
}

export default function UserRegisterForm() {
  const { locale } = useLocale();
  const messages = getCustomerAuthMessages(locale);
  const copy = messages.register;

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<RequesterSegment | null>("individual");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const stepSegment =
    currentStep === 0 ? (selectedSegment ?? "individual") : form.segment;
  const steps = getRegistrationSteps(stepSegment, copy);
  const currentStepId = steps[currentStep]?.id;
  const isLastStep = currentStep === steps.length - 1;
  const activeSegment = selectedSegment ?? form.segment;

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function selectSegment(segment: RequesterSegment) {
    setSelectedSegment(segment);
    setFieldErrors((current) => {
      if (!current.segment) return current;
      const next = { ...current };
      delete next.segment;
      return next;
    });
  }

  function validateCurrentStep(): FieldErrors {
    switch (currentStepId) {
      case "account-type":
        return validateAccountTypeStep(selectedSegment, copy.errors);
      case "basic-info":
        return validateBasicInfoStep(form, copy.errors);
      case "business-details":
      case "government-details":
        return validateOrganizationStep(form, copy.errors);
      default:
        return {};
    }
  }

  function goToNextStep() {
    if (currentStepId === "account-type") {
      const errors = validateAccountTypeStep(selectedSegment, copy.errors);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        const message = firstFieldError(errors);
        if (message) showErrorToast({ title: message });
        return;
      }

      setFieldErrors({});
      setForm((current) => ({
        ...current,
        segment: selectedSegment!,
        ...(current.segment !== selectedSegment
          ? {
              organizationName: "",
              jobTitle: "",
              organizationAddress: "",
              taxId: "",
              registrationNumber: "",
              governmentEntityType: "",
              officialReference: "",
              billingContactName: "",
              billingContactEmail: "",
            }
          : {}),
      }));
      setCurrentStep(1);
      return;
    }

    const errors = validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const message = firstFieldError(errors);
      if (message) showErrorToast({ title: message });
      return;
    }

    setFieldErrors({});
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goToPreviousStep() {
    setFieldErrors({});
    if (currentStep === 1) {
      setSelectedSegment(form.segment);
    }
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function submitRegistration() {
    const errors = validateForm(form, copy.errors);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const message = firstFieldError(errors);
      if (message) showErrorToast({ title: message });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await registerUserApplication({
        email: form.email.trim(),
        password: form.password,
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName.trim(),
        mobile_number: formatEthiopianMobileNumber(form.mobile),
        segment: form.segment,
        organization_name: form.organizationName.trim() || null,
        job_title: form.jobTitle.trim() || null,
        organization_address: form.organizationAddress.trim() || null,
        tax_id: form.taxId.trim() || null,
        registration_number: form.registrationNumber.trim() || null,
        government_entity_type: form.governmentEntityType.trim() || null,
        official_reference: form.officialReference.trim() || null,
        billing_contact_name: form.billingContactName.trim() || null,
        billing_contact_email: form.billingContactEmail.trim() || null,
      });
      showSuccessToast({
        title: copy.registrationSubmitted,
        description: result.message,
      });
      setSuccessMessage(result.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.errors.createFailedDescription;
      showErrorToast({
        title: copy.errors.createFailedTitle,
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");

    if (!isLastStep) {
      goToNextStep();
      return;
    }

    await submitRegistration();
  }

  const shellDescription =
    activeSegment === "individual"
      ? copy.descriptions.individual
      : activeSegment === "business"
        ? copy.descriptions.business
        : activeSegment === "government"
          ? copy.descriptions.government
          : copy.descriptions.default;

  if (successMessage) {
    return (
      <RegistrationShell
        copy={copy}
        copyright={messages.common.copyright}
        description={copy.descriptions.success}
        aside={<RegistrationAside copy={copy} success />}
        contentAlign="center"
      >
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-10 lg:p-12">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#1C3A34]/[0.05] ring-8 ring-[#1C3A34]/[0.04]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1C3A34] text-white shadow-lg shadow-[#1C3A34]/25">
              <CheckCircle2 className="h-9 w-9" strokeWidth={2.25} />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9B87A]">
            {copy.applicationReceived}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1C3A34] sm:text-4xl">
            {copy.registrationSubmitted}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-500 sm:text-[15px]">
            {successMessage}
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-4 text-left lg:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">
              {copy.whatHappensNext}
            </p>
            <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
              {copy.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C3A34] px-5 py-4 text-[15px] font-bold text-white border-b-[3px] border-[#C9B87A] transition-all hover:bg-[#162e29] hover:shadow-lg hover:shadow-[#1C3A34]/15 sm:mt-10"
          >
            <ArrowLeft className="h-4 w-4" />
            {messages.common.backToHome}
          </Link>
        </div>
      </RegistrationShell>
    );
  }

  const pageIntro =
    currentStepId === "account-type"
      ? copy.pageIntros.accountType
      : currentStepId === "basic-info"
        ? copy.pageIntros.basicInfo
        : copy.pageIntros.organization;

  const segmentOptions = REQUESTER_SEGMENT_OPTIONS.map((option) => ({
    value: option.value,
    title: copy.segments[option.value].title,
    description: copy.segments[option.value].description,
  }));

  return (
    <RegistrationShell
      copy={copy}
      copyright={messages.common.copyright}
      description={shellDescription}
      aside={<RegistrationAside copy={copy} steps={steps} currentStep={currentStep} />}
    >
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 p-8 sm:p-10 lg:p-12">
        <div className="mb-8 border-b border-slate-100 pb-8">
          <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">{copy.pageTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-500">{pageIntro}</p>
        </div>

        <StepperHeader
          steps={steps}
          currentStep={currentStep}
          stepOfLabel={formatMessage(copy.stepOf, {
            current: currentStep + 1,
            total: steps.length,
          })}
        />

        <form className="space-y-10" onSubmit={handleFormSubmit} noValidate>
          {currentStepId === "account-type" ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {segmentOptions.slice(0, 2).map((option) => (
                    <AccountTypeOptionCard
                      key={option.value}
                      segment={option.value}
                      title={option.title}
                      description={option.description}
                      selected={selectedSegment === option.value}
                      disabled={isSubmitting}
                      onSelect={() => selectSegment(option.value)}
                    />
                  ))}
                </div>
                {segmentOptions.slice(2).map((option) => (
                  <AccountTypeOptionCard
                    key={option.value}
                    segment={option.value}
                    title={option.title}
                    description={option.description}
                    selected={selectedSegment === option.value}
                    disabled={isSubmitting}
                    onSelect={() => selectSegment(option.value)}
                  />
                ))}
              </div>
              {fieldErrors.segment ? (
                <p className="text-sm text-red-600">{fieldErrors.segment}</p>
              ) : null}
            </div>
          ) : null}

          {currentStepId === "basic-info" ? (
            <div className="space-y-6">
              <SegmentBadge segment={form.segment} copy={copy} />

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-first-name"
                    className={cn(labelClassName, fieldErrors.firstName && errorLabelClassName)}
                  >
                    {copy.fields.firstName}
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="user-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.firstName}
                      className={cn(inputClassName, fieldErrors.firstName && errorInputClassName)}
                    />
                  </div>
                  {fieldErrors.firstName ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.firstName}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="user-middle-name" className={labelClassName}>
                    {copy.fields.middleName}{" "}
                    <span className="font-normal text-slate-400">{copy.optional}</span>
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="user-middle-name"
                      type="text"
                      autoComplete="additional-name"
                      value={form.middleName}
                      onChange={(event) => updateField("middleName", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.middleName}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="user-last-name"
                  className={cn(labelClassName, fieldErrors.lastName && errorLabelClassName)}
                >
                  {copy.fields.lastName}
                </label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="user-last-name"
                    type="text"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    disabled={isSubmitting}
                    placeholder={copy.placeholders.lastName}
                    className={cn(inputClassName, fieldErrors.lastName && errorInputClassName)}
                  />
                </div>
                {fieldErrors.lastName ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.lastName}</p>
                ) : null}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-email"
                    className={cn(labelClassName, fieldErrors.email && errorLabelClassName)}
                  >
                    {copy.fields.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="user-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.email}
                      className={cn(inputClassName, fieldErrors.email && errorInputClassName)}
                    />
                  </div>
                  {fieldErrors.email ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="user-mobile"
                    className={cn(labelClassName, fieldErrors.mobile && errorLabelClassName)}
                  >
                    {copy.fields.mobile}
                  </label>
                  <div
                    className={cn(
                      "flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-[#1C3A34] focus-within:ring-2 focus-within:ring-[#1C3A34]/20 disabled:opacity-70",
                      fieldErrors.mobile && "border-red-300 bg-red-50/60 focus-within:border-red-400 focus-within:ring-red-200/60",
                    )}
                  >
                    <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                      <span aria-hidden className="text-base leading-none">
                        🇪🇹
                      </span>
                      <span className="font-semibold tabular-nums">{ETHIOPIA_MOBILE_COUNTRY_CODE}</span>
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="user-mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={form.mobile}
                        onChange={(event) =>
                          updateField("mobile", sanitizeEthiopianMobileInput(event.target.value))
                        }
                        disabled={isSubmitting}
                        placeholder={ETHIOPIAN_MOBILE_PLACEHOLDER}
                        className="w-full border-0 bg-transparent py-4 pl-10 pr-4 text-[15px] text-slate-800 outline-none disabled:opacity-70"
                      />
                    </div>
                  </div>
                  {fieldErrors.mobile ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.mobile}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-password"
                    className={cn(labelClassName, fieldErrors.password && errorLabelClassName)}
                  >
                    {copy.fields.password}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="user-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.password}
                      className={cn(inputClassName, "pr-11", fieldErrors.password && errorInputClassName)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((open) => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={
                        showPassword ? messages.common.hidePassword : messages.common.showPassword
                      }
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="user-confirm-password"
                    className={cn(labelClassName, fieldErrors.confirmPassword && errorLabelClassName)}
                  >
                    {copy.fields.confirmPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="user-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(event) => updateField("confirmPassword", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.confirmPassword}
                      className={cn(
                        inputClassName,
                        "pr-11",
                        fieldErrors.confirmPassword && errorInputClassName,
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((open) => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={
                        showConfirmPassword
                          ? messages.common.hidePassword
                          : messages.common.showPassword
                      }
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {currentStepId === "business-details" || currentStepId === "government-details" ? (
            <div className="space-y-6">
              <SegmentBadge segment={form.segment} copy={copy} />

              <div>
                <label
                  htmlFor="user-organization-name"
                  className={cn(labelClassName, fieldErrors.organizationName && errorLabelClassName)}
                >
                  {form.segment === "business" ? copy.fields.organizationName : copy.fields.agencyName}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="user-organization-name"
                    type="text"
                    value={form.organizationName}
                    onChange={(event) => updateField("organizationName", event.target.value)}
                    disabled={isSubmitting}
                    placeholder={copy.placeholders.organizationName}
                    className={cn(inputClassName, fieldErrors.organizationName && errorInputClassName)}
                  />
                </div>
                {fieldErrors.organizationName ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.organizationName}</p>
                ) : null}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-job-title"
                    className={cn(labelClassName, fieldErrors.jobTitle && errorLabelClassName)}
                  >
                    {copy.fields.jobTitle}
                  </label>
                  <input
                    id="user-job-title"
                    type="text"
                    value={form.jobTitle}
                    onChange={(event) => updateField("jobTitle", event.target.value)}
                    disabled={isSubmitting}
                    placeholder={copy.placeholders.jobTitle}
                    className={cn(plainInputClassName, fieldErrors.jobTitle && errorInputClassName)}
                  />
                  {fieldErrors.jobTitle ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.jobTitle}</p>
                  ) : null}
                </div>

                {form.segment === "government" ? (
                  <div>
                    <label
                      htmlFor="user-government-entity-type"
                      className={cn(
                        labelClassName,
                        fieldErrors.governmentEntityType && errorLabelClassName,
                      )}
                    >
                      {copy.fields.entityType}
                    </label>
                    <select
                      id="user-government-entity-type"
                      value={form.governmentEntityType}
                      onChange={(event) => updateField("governmentEntityType", event.target.value)}
                      disabled={isSubmitting}
                      className={cn(plainInputClassName, fieldErrors.governmentEntityType && errorInputClassName)}
                    >
                      <option value="">{copy.selectEntityType}</option>
                      {GOVERNMENT_ENTITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {copy.entityTypes[type]}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.governmentEntityType ? (
                      <p className="mt-1.5 text-xs text-red-600">{fieldErrors.governmentEntityType}</p>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="user-registration-number"
                      className={cn(
                        labelClassName,
                        fieldErrors.registrationNumber && errorLabelClassName,
                      )}
                    >
                      {copy.fields.registrationNumber}
                    </label>
                    <input
                      id="user-registration-number"
                      type="text"
                      value={form.registrationNumber}
                      onChange={(event) => updateField("registrationNumber", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.registrationNumber}
                      className={cn(
                        plainInputClassName,
                        fieldErrors.registrationNumber && errorInputClassName,
                      )}
                    />
                    {fieldErrors.registrationNumber ? (
                      <p className="mt-1.5 text-xs text-red-600">{fieldErrors.registrationNumber}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="user-organization-address"
                  className={cn(
                    labelClassName,
                    fieldErrors.organizationAddress && errorLabelClassName,
                  )}
                >
                  {copy.fields.organizationAddress}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  <textarea
                    id="user-organization-address"
                    rows={3}
                    value={form.organizationAddress}
                    onChange={(event) => updateField("organizationAddress", event.target.value)}
                    disabled={isSubmitting}
                    placeholder={copy.placeholders.organizationAddress}
                    className={cn(
                      inputClassName,
                      "min-h-[96px] resize-none py-3",
                      fieldErrors.organizationAddress && errorInputClassName,
                    )}
                  />
                </div>
                {fieldErrors.organizationAddress ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.organizationAddress}</p>
                ) : null}
              </div>

              {form.segment === "business" ? (
                <div>
                  <label
                    htmlFor="user-tax-id"
                    className={cn(labelClassName, fieldErrors.taxId && errorLabelClassName)}
                  >
                    {copy.fields.taxId}
                  </label>
                  <input
                    id="user-tax-id"
                    type="text"
                    value={form.taxId}
                    onChange={(event) => updateField("taxId", event.target.value)}
                    disabled={isSubmitting}
                    placeholder={copy.placeholders.taxId}
                    className={cn(plainInputClassName, fieldErrors.taxId && errorInputClassName)}
                  />
                  {fieldErrors.taxId ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.taxId}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="user-official-reference"
                      className={cn(
                        labelClassName,
                        fieldErrors.officialReference && errorLabelClassName,
                      )}
                    >
                      {copy.fields.officialReference}
                    </label>
                    <input
                      id="user-official-reference"
                      type="text"
                      value={form.officialReference}
                      onChange={(event) => updateField("officialReference", event.target.value)}
                      disabled={isSubmitting}
                      placeholder={copy.placeholders.officialReference}
                      className={cn(
                        plainInputClassName,
                        fieldErrors.officialReference && errorInputClassName,
                      )}
                    />
                    {fieldErrors.officialReference ? (
                      <p className="mt-1.5 text-xs text-red-600">{fieldErrors.officialReference}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="user-billing-contact-name"
                        className={cn(
                          labelClassName,
                          fieldErrors.billingContactName && errorLabelClassName,
                        )}
                      >
                        {copy.fields.billingContactName}
                      </label>
                      <input
                        id="user-billing-contact-name"
                        type="text"
                        value={form.billingContactName}
                        onChange={(event) => updateField("billingContactName", event.target.value)}
                        disabled={isSubmitting}
                        placeholder={copy.placeholders.billingContactName}
                        className={cn(
                          plainInputClassName,
                          fieldErrors.billingContactName && errorInputClassName,
                        )}
                      />
                      {fieldErrors.billingContactName ? (
                        <p className="mt-1.5 text-xs text-red-600">{fieldErrors.billingContactName}</p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor="user-billing-contact-email"
                        className={cn(
                          labelClassName,
                          fieldErrors.billingContactEmail && errorLabelClassName,
                        )}
                      >
                        {copy.fields.billingContactEmail}
                      </label>
                      <input
                        id="user-billing-contact-email"
                        type="email"
                        value={form.billingContactEmail}
                        onChange={(event) => updateField("billingContactEmail", event.target.value)}
                        disabled={isSubmitting}
                        placeholder={copy.placeholders.billingContactEmail}
                        className={cn(
                          plainInputClassName,
                          fieldErrors.billingContactEmail && errorInputClassName,
                        )}
                      />
                      {fieldErrors.billingContactEmail ? (
                        <p className="mt-1.5 text-xs text-red-600">{fieldErrors.billingContactEmail}</p>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70"
              >
                <ArrowLeft className="h-4 w-4" />
                {copy.back}
              </button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C3A34] px-5 py-4 text-[15px] font-bold text-white border-b-[3px] border-[#C9B87A] transition-all hover:bg-[#162e29] hover:shadow-xl hover:shadow-[#1C3A34]/10 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[200px] sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.creatingAccount}
                </>
              ) : isLastStep ? (
                copy.createAccount
              ) : (
                <>
                  {copy.continue}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </RegistrationShell>
  );
}
