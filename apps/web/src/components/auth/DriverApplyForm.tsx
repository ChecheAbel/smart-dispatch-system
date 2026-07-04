"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { registerDriverApplication } from "@/lib/auth-api";
import {
  DRIVER_LICENSE_PHOTO_ACCEPT,
  validateDriverLicensePhoto,
} from "@/lib/driver-license-photo";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  ETHIOPIAN_MOBILE_HELP,
  ETHIOPIAN_MOBILE_INVALID_MESSAGE,
  ETHIOPIAN_MOBILE_PLACEHOLDER,
  formatEthiopianMobileNumber,
  isValidEthiopianMobileLocal,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import {
  isValidDriverLicenseNumber,
  normalizeDriverLicenseNumber,
} from "@/lib/driver-license";
import { isValidEmail } from "@/lib/validation";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70";
const labelClassName =
  "block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2";
const errorInputClassName =
  "border-red-300 bg-red-50/60 focus:border-red-400 focus:ring-red-200/60";
const errorLabelClassName = "text-red-700";

const STEPS = [
  {
    id: "personal",
    title: "Personal",
    description: "Tell us your legal name as it appears on your license.",
    fields: ["firstName", "lastName"] as const,
  },
  {
    id: "contact",
    title: "Contact",
    description: "How operators and dispatch can reach you.",
    fields: ["email", "mobile"] as const,
  },
  {
    id: "license",
    title: "License",
    description: "Upload your driving credentials for verification.",
    fields: ["driverLicense"] as const,
    includesPhoto: true,
  },
  {
    id: "account",
    title: "Account",
    description: "Create your login and confirm the onboarding terms.",
    fields: ["password", "confirmPassword", "acceptedTerms"] as const,
  },
] as const;

type DriverApplyFormState = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mobile: string;
  driverLicense: string;
  acceptedTerms: boolean;
};

type FieldName = keyof DriverApplyFormState | "driverLicensePhoto";

type FieldErrors = Partial<Record<FieldName, string>>;

const emptyForm: DriverApplyFormState = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  middleName: "",
  lastName: "",
  mobile: "",
  driverLicense: "",
  acceptedTerms: false,
};

function validateField(name: FieldName, form: DriverApplyFormState): string | undefined {
  switch (name) {
    case "firstName":
      if (!form.firstName.trim()) return "First name is required.";
      return undefined;
    case "lastName":
      if (!form.lastName.trim()) return "Last name is required.";
      return undefined;
    case "email": {
      const email = form.email.trim();
      if (!email) return "Email is required.";
      if (!isValidEmail(email)) return "Enter a valid email address.";
      return undefined;
    }
    case "mobile":
      if (!form.mobile.trim()) return "Mobile number is required.";
      if (!isValidEthiopianMobileLocal(form.mobile)) {
        return ETHIOPIAN_MOBILE_INVALID_MESSAGE;
      }
      return undefined;
    case "driverLicense":
      if (!form.driverLicense.trim()) return "Driver license number is required.";
      if (!isValidDriverLicenseNumber(form.driverLicense)) {
        return "Enter a valid license number (5–30 letters, numbers, or dashes).";
      }
      return undefined;
    case "acceptedTerms":
      if (!form.acceptedTerms) return "You must accept the terms to continue.";
      return undefined;
    case "password":
      if (!form.password) return "Password is required.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      return undefined;
    case "confirmPassword":
      if (!form.confirmPassword) return "Please confirm your password.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
      return undefined;
    default:
      return undefined;
  }
}

function validateStep(
  stepIndex: number,
  form: DriverApplyFormState,
  driverLicensePhoto: File | null,
): FieldErrors {
  const step = STEPS[stepIndex];
  const errors: FieldErrors = {};

  for (const field of step.fields) {
    const message = validateField(field, form);
    if (message) {
      errors[field] = message;
    }
  }

  if ("includesPhoto" in step && step.includesPhoto) {
    const photoError = validateDriverLicensePhoto(driverLicensePhoto);
    if (photoError) {
      errors.driverLicensePhoto = photoError;
    }
  }

  return errors;
}

function StepperHeader({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-6 space-y-4 border-b border-slate-100 pb-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <p className="text-sm font-semibold text-[#1C3A34]">{STEPS[currentStep].title}</p>
      </div>

      <div className="flex gap-2">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= currentStep ? "bg-[#1C3A34]" : "bg-slate-200",
            )}
            aria-hidden
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed text-slate-500">{STEPS[currentStep].description}</p>
    </div>
  );
}

export default function DriverApplyForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<DriverApplyFormState>(emptyForm);
  const [driverLicensePhoto, setDriverLicensePhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  const isLastStep = currentStep === STEPS.length - 1;

  useEffect(() => {
    if (!driverLicensePhoto) {
      setPhotoPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(driverLicensePhoto);
    setPhotoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [driverLicensePhoto]);

  function updateField<K extends keyof DriverApplyFormState>(
    key: K,
    value: DriverApplyFormState[K],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      setFieldErrors((errors) => {
        const nextErrors = { ...errors };
        delete nextErrors[key];

        if (key === "password" && next.confirmPassword) {
          const confirmError = validateField("confirmPassword", next);
          if (confirmError) {
            nextErrors.confirmPassword = confirmError;
          } else {
            delete nextErrors.confirmPassword;
          }
        }

        return nextErrors;
      });

      return next;
    });
  }

  function updateDriverLicensePhoto(file: File | null) {
    setDriverLicensePhoto(file);
    setFieldErrors((errors) => {
      if (!errors.driverLicensePhoto) {
        return errors;
      }

      const next = { ...errors };
      delete next.driverLicensePhoto;
      return next;
    });
  }

  function handleBlur(field: Exclude<FieldName, "driverLicensePhoto" | "acceptedTerms">) {
    const message = validateField(field, form);
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  function goToNextStep() {
    const stepErrors = validateStep(currentStep, form, driverLicensePhoto);
    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(stepErrors);
      return;
    }

    setFieldErrors({});
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  function goToPreviousStep() {
    setFieldErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function submitApplication() {
    const nextErrors = validateStep(currentStep, form, driverLicensePhoto);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerDriverApplication({
        email: form.email.trim(),
        password: form.password,
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName.trim(),
        mobile_number: formatEthiopianMobileNumber(form.mobile),
        driver_license_number: normalizeDriverLicenseNumber(form.driverLicense),
        driver_license_photo: driverLicensePhoto!,
      });

      setSuccessMessage(result.message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Application failed. Please try again.";
      showErrorToast({
        title: "Could not submit application",
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

    await submitApplication();
  }

  if (successMessage) {
    return (
      <AuthShell
        mobileTitle="Driver Application"
        desktopEyebrow="— Driver Onboarding —"
        desktopTitle={
          <>
            Join the{" "}
            <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
              Smart Dispatch
            </span>{" "}
            Network
          </>
        }
        desktopDescription="Apply to drive with operators using Smart Dispatch for booking, dispatch, and fleet operations."
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1C3A34] tracking-tight">Application received</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{successMessage}</p>
          <Link
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[#1C3A34] px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#162e29]"
          >
            Back to home
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mobileTitle="Driver Application"
      desktopEyebrow="— Driver Onboarding —"
      desktopTitle={
        <>
          Join the{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            Smart Dispatch
          </span>{" "}
          Network
        </>
      }
      desktopDescription="Apply to drive with operators using Smart Dispatch for booking, dispatch, and fleet operations."
    >
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Apply —</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">Driver Registration</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Complete the steps below to apply. An administrator will review and activate your profile
          before you can sign in.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        <StepperHeader currentStep={currentStep} />

        <form className="space-y-5" onSubmit={handleFormSubmit} noValidate>
          {currentStep === 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="driver-first-name"
                    className={cn(labelClassName, fieldErrors.firstName && errorLabelClassName)}
                  >
                    First Name
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="driver-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      onBlur={() => handleBlur("firstName")}
                      disabled={isSubmitting}
                      className={cn(inputClassName, fieldErrors.firstName && errorInputClassName)}
                      placeholder="Abebe"
                    />
                  </div>
                  {fieldErrors.firstName ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.firstName}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="driver-last-name"
                    className={cn(labelClassName, fieldErrors.lastName && errorLabelClassName)}
                  >
                    Last Name
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="driver-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      onBlur={() => handleBlur("lastName")}
                      disabled={isSubmitting}
                      className={cn(inputClassName, fieldErrors.lastName && errorInputClassName)}
                      placeholder="Kebede"
                    />
                  </div>
                  {fieldErrors.lastName ? (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.lastName}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="driver-middle-name" className={labelClassName}>
                  Middle Name{" "}
                  <span className="font-medium normal-case tracking-normal text-slate-400">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="driver-middle-name"
                    type="text"
                    autoComplete="additional-name"
                    value={form.middleName}
                    onChange={(event) => updateField("middleName", event.target.value)}
                    disabled={isSubmitting}
                    className={inputClassName}
                    placeholder="Tesfaye"
                  />
                </div>
              </div>
            </>
          ) : null}

          {currentStep === 1 ? (
            <>
              <div>
                <label
                  htmlFor="driver-email"
                  className={cn(labelClassName, fieldErrors.email && errorLabelClassName)}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="driver-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    onBlur={() => handleBlur("email")}
                    disabled={isSubmitting}
                    className={cn(inputClassName, fieldErrors.email && errorInputClassName)}
                    placeholder="driver@email.com"
                  />
                </div>
                {fieldErrors.email ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="driver-mobile"
                  className={cn(labelClassName, fieldErrors.mobile && errorLabelClassName)}
                >
                  Mobile Number
                </label>
                <div
                  className={cn(
                    "flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm focus-within:border-[#1C3A34] focus-within:ring-2 focus-within:ring-[#1C3A34]/20",
                    fieldErrors.mobile &&
                      "border-red-300 bg-red-50/60 focus-within:border-red-400 focus-within:ring-red-200/60",
                  )}
                >
                  <span className="flex shrink-0 items-center border-r border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
                    {ETHIOPIA_MOBILE_COUNTRY_CODE}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="driver-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={form.mobile}
                      onChange={(event) =>
                        updateField("mobile", sanitizeEthiopianMobileInput(event.target.value))
                      }
                      onBlur={() => handleBlur("mobile")}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full border-0 bg-transparent py-3.5 pl-10 pr-4 text-sm text-slate-800 outline-none disabled:opacity-70",
                        fieldErrors.mobile && "text-red-900",
                      )}
                      placeholder={ETHIOPIAN_MOBILE_PLACEHOLDER}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{ETHIOPIAN_MOBILE_HELP}</p>
                {fieldErrors.mobile ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.mobile}</p>
                ) : null}
              </div>
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <div>
                <label
                  htmlFor="driver-license"
                  className={cn(labelClassName, fieldErrors.driverLicense && errorLabelClassName)}
                >
                  Driver License Number
                </label>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="driver-license"
                    type="text"
                    autoComplete="off"
                    value={form.driverLicense}
                    onChange={(event) =>
                      updateField("driverLicense", event.target.value.toUpperCase().replace(/\s+/g, ""))
                    }
                    onBlur={() => handleBlur("driverLicense")}
                    disabled={isSubmitting}
                    className={cn(inputClassName, fieldErrors.driverLicense && errorInputClassName)}
                    placeholder="AA-123456"
                  />
                </div>
                {fieldErrors.driverLicense ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.driverLicense}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="driver-license-photo"
                  className={cn(labelClassName, fieldErrors.driverLicensePhoto && errorLabelClassName)}
                >
                  Driver License Photo
                </label>
                <div
                  className={cn(
                    "rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4",
                    fieldErrors.driverLicensePhoto && "border-red-300 bg-red-50/60",
                  )}
                >
                  {photoPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreviewUrl}
                          alt="Driver license preview"
                          className="max-h-56 w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => updateDriverLicensePhoto(null)}
                          disabled={isSubmitting}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition-colors hover:text-[#1C3A34]"
                          aria-label="Remove driver license photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">{driverLicensePhoto?.name}</p>
                    </div>
                  ) : (
                    <label
                      htmlFor="driver-license-photo"
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 py-6 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1C3A34]/8 text-[#1C3A34]">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#1C3A34]">Upload license photo</p>
                        <p className="text-xs text-slate-500">JPG, PNG, or WEBP up to 5 MB</p>
                      </div>
                    </label>
                  )}

                  <input
                    id="driver-license-photo"
                    type="file"
                    accept={DRIVER_LICENSE_PHOTO_ACCEPT}
                    className="sr-only"
                    disabled={isSubmitting}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      updateDriverLicensePhoto(file);
                      event.target.value = "";
                    }}
                  />

                  {photoPreviewUrl ? (
                    <div className="mt-3">
                      <label
                        htmlFor="driver-license-photo-replace"
                        className="inline-flex cursor-pointer text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A]"
                      >
                        Replace photo
                      </label>
                      <input
                        id="driver-license-photo-replace"
                        type="file"
                        accept={DRIVER_LICENSE_PHOTO_ACCEPT}
                        className="sr-only"
                        disabled={isSubmitting}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          updateDriverLicensePhoto(file);
                          event.target.value = "";
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                {fieldErrors.driverLicensePhoto ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.driverLicensePhoto}</p>
                ) : null}
              </div>
            </>
          ) : null}

          {currentStep === 3 ? (
            <>
              <div>
                <label
                  htmlFor="driver-password"
                  className={cn(labelClassName, fieldErrors.password && errorLabelClassName)}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="driver-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    onBlur={() => handleBlur("password")}
                    disabled={isSubmitting}
                    className={cn(inputClassName, "pr-12", fieldErrors.password && errorInputClassName)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1C3A34] transition-colors"
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
                  htmlFor="driver-confirm-password"
                  className={cn(labelClassName, fieldErrors.confirmPassword && errorLabelClassName)}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="driver-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    disabled={isSubmitting}
                    className={cn(
                      inputClassName,
                      "pr-12",
                      fieldErrors.confirmPassword && errorInputClassName,
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1C3A34] transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword ? (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="driver-accepted-terms"
                    checked={form.acceptedTerms}
                    onCheckedChange={(checked) => updateField("acceptedTerms", checked === true)}
                    disabled={isSubmitting}
                    className="mt-0.5 data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="driver-accepted-terms"
                      className={cn(
                        "text-sm font-medium leading-relaxed text-slate-700",
                        fieldErrors.acceptedTerms && "text-red-700",
                      )}
                    >
                      I confirm that the information provided is accurate and I agree to the driver
                      onboarding terms.
                    </Label>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Your application will be reviewed by an administrator before your account is
                      activated.
                    </p>
                  </div>
                </div>
                {fieldErrors.acceptedTerms ? (
                  <p className="mt-2 text-xs text-red-600">{fieldErrors.acceptedTerms}</p>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C3A34] px-4 py-3.5 text-sm font-bold text-white border-b-[3px] border-[#C9B87A] transition-all hover:bg-[#162e29] disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[180px] sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : isLastStep ? (
                "Submit Application"
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

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/" className="font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors">
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
