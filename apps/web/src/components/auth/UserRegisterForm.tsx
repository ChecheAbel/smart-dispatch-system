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
import { registerUserApplication } from "@/lib/auth-api";
import {
  ETHIOPIAN_MOBILE_INVALID_MESSAGE,
  ETHIOPIAN_MOBILE_PLACEHOLDER,
  formatEthiopianMobileNumber,
  isValidEthiopianMobileLocal,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import { GOVERNMENT_ENTITY_TYPES, REQUESTER_SEGMENT_OPTIONS } from "@/lib/requester-segments";
import { showErrorToast } from "@/lib/toast";
import { isValidEmail } from "@/lib/validation";
import { cn } from "@/lib/utils";

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

function validateBasicInfoStep(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";

  const email = form.email.trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.mobile.trim()) {
    errors.mobile = "Mobile number is required.";
  } else if (!isValidEthiopianMobileLocal(form.mobile)) {
    errors.mobile = ETHIOPIAN_MOBILE_INVALID_MESSAGE;
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

function validateOrganizationStep(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (form.segment === "business") {
    if (!form.organizationName.trim()) errors.organizationName = "Organization name is required.";
    if (!form.jobTitle.trim()) errors.jobTitle = "Job title is required.";
    if (!form.organizationAddress.trim()) {
      errors.organizationAddress = "Organization address is required.";
    }
    if (!form.taxId.trim()) errors.taxId = "Tax ID / TIN is required.";
    if (!form.registrationNumber.trim()) {
      errors.registrationNumber = "Business registration number is required.";
    }
  }

  if (form.segment === "government") {
    if (!form.organizationName.trim()) {
      errors.organizationName = "Government organization name is required.";
    }
    if (!form.jobTitle.trim()) errors.jobTitle = "Job title is required.";
    if (!form.organizationAddress.trim()) {
      errors.organizationAddress = "Organization address is required.";
    }
    if (!form.governmentEntityType.trim()) {
      errors.governmentEntityType = "Government entity type is required.";
    }
    if (!form.officialReference.trim()) {
      errors.officialReference = "Official reference / procurement code is required.";
    }
    if (!form.billingContactName.trim()) {
      errors.billingContactName = "Billing contact name is required.";
    }
    const billingEmail = form.billingContactEmail.trim();
    if (!billingEmail) {
      errors.billingContactEmail = "Billing contact email is required.";
    } else if (!isValidEmail(billingEmail)) {
      errors.billingContactEmail = "Enter a valid billing contact email.";
    }
  }

  return errors;
}

function validateForm(form: FormState): FieldErrors {
  return {
    ...validateBasicInfoStep(form),
    ...validateOrganizationStep(form),
  };
}

type RegistrationStep = {
  id: "account-type" | "basic-info" | "business-details" | "government-details";
  title: string;
  description: string;
};

function getRegistrationSteps(segment: RequesterSegment): RegistrationStep[] {
  const steps: RegistrationStep[] = [
    {
      id: "account-type",
      title: "Account type",
      description: "Choose who will be requesting vehicles on this platform.",
    },
    {
      id: "basic-info",
      title: "Basic information",
      description: "Enter your personal details and create your login credentials.",
    },
  ];

  if (segment === "business") {
    steps.push({
      id: "business-details",
      title: "Business details",
      description: "Organization information used for billing and account verification.",
    });
  } else if (segment === "government") {
    steps.push({
      id: "government-details",
      title: "Government details",
      description: "Official agency information required for government transport requests.",
    });
  }

  return steps;
}

function validateAccountTypeStep(segment: RequesterSegment | null): FieldErrors {
  if (!segment) {
    return { segment: "Please select an account type to continue." };
  }
  return {};
}

function segmentLabel(segment: RequesterSegment): string {
  return REQUESTER_SEGMENT_OPTIONS.find((option) => option.value === segment)?.title ?? segment;
}

function SegmentBadge({ segment }: { segment: RequesterSegment }) {
  const Icon = segmentIcon(segment);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1C3A34] text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account type</p>
        <p className="text-sm font-semibold text-[#1C3A34]">{segmentLabel(segment)}</p>
      </div>
    </div>
  );
}

function StepperHeader({
  steps,
  currentStep,
}: {
  steps: RegistrationStep[];
  currentStep: number;
}) {
  const step = steps[currentStep];

  return (
    <div className="mb-8 space-y-4 border-b border-slate-100 pb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Step {currentStep + 1} of {steps.length}
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
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: (typeof REQUESTER_SEGMENT_OPTIONS)[number];
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = segmentIcon(option.value);

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
      <p className="text-[15px] font-semibold text-slate-900">{option.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{option.description}</p>
    </button>
  );
}

function RegistrationAside({
  steps,
  currentStep,
  success = false,
}: {
  steps?: RegistrationStep[];
  currentStep?: number;
  success?: boolean;
}) {
  if (success) {
    return (
      <div className="space-y-5 border-t border-white/10 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">What happens next</p>
        <ol className="space-y-4">
          {[
            "An administrator reviews your application.",
            "You receive confirmation once your account is approved.",
            "Sign in and start requesting vehicles on the platform.",
          ].map((text, index) => (
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">Your progress</p>
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
        <p className="text-sm font-semibold text-white/90">Why register?</p>
        <ul className="space-y-3 text-sm text-white/55">
          <li className="flex gap-3">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-[#C9B87A]" />
            Request vehicles for personal, business, or official use.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C9B87A]" />
            Secure accounts verified by platform administrators.
          </li>
          <li className="flex gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9B87A]" />
            Manage bookings and transport requests in one place.
          </li>
        </ul>
      </div>
    </div>
  );
}

function RegistrationShell({
  children,
  description,
  aside,
  contentAlign = "start",
}: {
  children: ReactNode;
  description: string;
  aside?: ReactNode;
  contentAlign?: "center" | "start";
}) {
  return (
    <AuthShell
      mobileTitle="User Registration"
      desktopEyebrow="— User Onboarding —"
      contentClassName="max-w-xl xl:max-w-2xl"
      contentAlign={contentAlign}
      desktopTitle={
        <>
          Join{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            Smart Dispatch
          </span>
        </>
      }
      desktopDescription={description}
      desktopAside={aside}
    >
      {children}
    </AuthShell>
  );
}

export default function UserRegisterForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<RequesterSegment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const stepSegment =
    currentStep === 0 ? (selectedSegment ?? "individual") : form.segment;
  const steps = getRegistrationSteps(stepSegment);
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
        return validateAccountTypeStep(selectedSegment);
      case "basic-info":
        return validateBasicInfoStep(form);
      case "business-details":
      case "government-details":
        return validateOrganizationStep(form);
      default:
        return {};
    }
  }

  function goToNextStep() {
    if (currentStepId === "account-type") {
      const errors = validateAccountTypeStep(selectedSegment);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
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
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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
      setSuccessMessage(result.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed. Please try again.";
      showErrorToast({
        title: "Could not create account",
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
      ? "Create a personal account for individual vehicle requests."
      : activeSegment === "business"
        ? "Register your organization to request vehicles for business use."
        : activeSegment === "government"
          ? "Register your government agency to request official transport services."
          : "Create your Smart Dispatch account in a few simple steps.";

  if (successMessage) {
    return (
      <RegistrationShell
        description="Sign up for Smart Dispatch and access the platform once your account is approved."
        aside={<RegistrationAside success />}
        contentAlign="center"
      >
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-10 lg:p-12">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#1C3A34]/[0.05] ring-8 ring-[#1C3A34]/[0.04]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1C3A34] text-white shadow-lg shadow-[#1C3A34]/25">
              <CheckCircle2 className="h-9 w-9" strokeWidth={2.25} />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9B87A]">
            Application received
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1C3A34] sm:text-4xl">
            Registration submitted
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-500 sm:text-[15px]">
            {successMessage}
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-4 text-left lg:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">What happens next</p>
            <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
              <li>An administrator reviews your application.</li>
              <li>You receive confirmation once your account is approved.</li>
              <li>Sign in and start requesting vehicles on the platform.</li>
            </ol>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C3A34] px-5 py-4 text-[15px] font-bold text-white border-b-[3px] border-[#C9B87A] transition-all hover:bg-[#162e29] hover:shadow-lg hover:shadow-[#1C3A34]/15 sm:mt-10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </RegistrationShell>
    );
  }

  const pageIntro =
    currentStepId === "account-type"
      ? "Start by choosing the account type that best fits how you'll use Smart Dispatch."
      : currentStepId === "basic-info"
        ? "Tell us about yourself and set up your login credentials."
        : "Provide the required organization details to complete your application.";

  return (
    <RegistrationShell
      description={shellDescription}
      aside={<RegistrationAside steps={steps} currentStep={currentStep} />}
    >
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[#1C3A34]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 p-8 sm:p-10 lg:p-12">
        <div className="mb-8 border-b border-slate-100 pb-8">
          <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">Create your account</h2>
          <p className="mt-3 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-500">{pageIntro}</p>
        </div>

        <StepperHeader steps={steps} currentStep={currentStep} />

        <form className="space-y-10" onSubmit={handleFormSubmit} noValidate>
          {currentStepId === "account-type" ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {REQUESTER_SEGMENT_OPTIONS.slice(0, 2).map((option) => (
                    <AccountTypeOptionCard
                      key={option.value}
                      option={option}
                      selected={selectedSegment === option.value}
                      disabled={isSubmitting}
                      onSelect={() => selectSegment(option.value)}
                    />
                  ))}
                </div>
                {REQUESTER_SEGMENT_OPTIONS.slice(2).map((option) => (
                  <AccountTypeOptionCard
                    key={option.value}
                    option={option}
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
              <SegmentBadge segment={form.segment} />

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-first-name"
                    className={cn(labelClassName, fieldErrors.firstName && errorLabelClassName)}
                  >
                    First name
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
                      placeholder="First name"
                      className={cn(inputClassName, fieldErrors.firstName && errorInputClassName)}
                    />
                  </div>
                  {fieldErrors.firstName ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.firstName}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="user-middle-name" className={labelClassName}>
                    Middle name <span className="font-normal text-slate-400">(optional)</span>
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
                      placeholder="Middle name"
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
                  Last name
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
                    placeholder="Last name"
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
                    Email address
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
                      placeholder="you@example.com"
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
                    Mobile number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="user-mobile"
                      type="tel"
                      autoComplete="tel-national"
                      value={form.mobile}
                      onChange={(event) =>
                        updateField("mobile", sanitizeEthiopianMobileInput(event.target.value))
                      }
                      disabled={isSubmitting}
                      placeholder={ETHIOPIAN_MOBILE_PLACEHOLDER}
                      className={cn(inputClassName, fieldErrors.mobile && errorInputClassName)}
                    />
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
                    Password
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
                      placeholder="At least 8 characters"
                      className={cn(inputClassName, "pr-11", fieldErrors.password && errorInputClassName)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((open) => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
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
                    Confirm password
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
                      placeholder="Re-enter password"
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
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
              <SegmentBadge segment={form.segment} />

              <div>
                <label
                  htmlFor="user-organization-name"
                  className={cn(labelClassName, fieldErrors.organizationName && errorLabelClassName)}
                >
                  {form.segment === "business" ? "Organization name" : "Agency / ministry name"}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="user-organization-name"
                    type="text"
                    value={form.organizationName}
                    onChange={(event) => updateField("organizationName", event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Organization name"
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
                    Job title
                  </label>
                  <input
                    id="user-job-title"
                    type="text"
                    value={form.jobTitle}
                    onChange={(event) => updateField("jobTitle", event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Fleet manager"
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
                      Entity type
                    </label>
                    <select
                      id="user-government-entity-type"
                      value={form.governmentEntityType}
                      onChange={(event) => updateField("governmentEntityType", event.target.value)}
                      disabled={isSubmitting}
                      className={cn(plainInputClassName, fieldErrors.governmentEntityType && errorInputClassName)}
                    >
                      <option value="">Select entity type</option>
                      {GOVERNMENT_ENTITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
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
                      Registration number
                    </label>
                    <input
                      id="user-registration-number"
                      type="text"
                      value={form.registrationNumber}
                      onChange={(event) => updateField("registrationNumber", event.target.value)}
                      disabled={isSubmitting}
                      placeholder="Business registration no."
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
                  Organization address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  <textarea
                    id="user-organization-address"
                    rows={3}
                    value={form.organizationAddress}
                    onChange={(event) => updateField("organizationAddress", event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Street, city, region"
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
                    Tax ID / TIN
                  </label>
                  <input
                    id="user-tax-id"
                    type="text"
                    value={form.taxId}
                    onChange={(event) => updateField("taxId", event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Tax identification number"
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
                      Official reference / procurement code
                    </label>
                    <input
                      id="user-official-reference"
                      type="text"
                      value={form.officialReference}
                      onChange={(event) => updateField("officialReference", event.target.value)}
                      disabled={isSubmitting}
                      placeholder="Reference or procurement code"
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
                        Billing contact name
                      </label>
                      <input
                        id="user-billing-contact-name"
                        type="text"
                        value={form.billingContactName}
                        onChange={(event) => updateField("billingContactName", event.target.value)}
                        disabled={isSubmitting}
                        placeholder="Finance officer"
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
                        Billing contact email
                      </label>
                      <input
                        id="user-billing-contact-email"
                        type="email"
                        value={form.billingContactEmail}
                        onChange={(event) => updateField("billingContactEmail", event.target.value)}
                        disabled={isSubmitting}
                        placeholder="billing@agency.gov.et"
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
                Back
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
                  Creating account…
                </>
              ) : isLastStep ? (
                "Create Account"
              ) : (
                <>
                  Continue
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
