"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  length?: number;
  idPrefix?: string;
};

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  length = 6,
  idPrefix = "otp",
}: OtpCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function toDigits(current: string) {
    return Array.from({ length }, (_, index) => current[index] ?? "");
  }

  function fromDigits(digits: string[]) {
    return digits.join("").slice(0, length);
  }

  function focusInput(index: number) {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    const digits = toDigits(value);

    if (!cleaned) {
      digits[index] = "";
      onChange(fromDigits(digits));
      return;
    }

    if (cleaned.length === 1) {
      digits[index] = cleaned;
      onChange(fromDigits(digits));
      if (index < length - 1) {
        focusInput(index + 1);
      }
      return;
    }

    cleaned.split("").forEach((char, offset) => {
      const target = index + offset;
      if (target < length) {
        digits[target] = char;
      }
    });
    onChange(fromDigits(digits));
    focusInput(Math.min(index + cleaned.length, length - 1));
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      const digits = toDigits(value);
      if (!digits[index] && index > 0) {
        event.preventDefault();
        digits[index - 1] = "";
        onChange(fromDigits(digits));
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const digits = toDigits(value);
    pasted.split("").forEach((char, offset) => {
      const target = index + offset;
      if (target < length) {
        digits[target] = char;
      }
    });
    onChange(fromDigits(digits));
    focusInput(Math.min(index + pasted.length, length - 1));
  }

  const digits = toDigits(value);

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          id={`${idPrefix}-${index}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            "h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-slate-200 bg-slate-50 text-center text-lg font-semibold text-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all",
            "disabled:cursor-not-allowed disabled:opacity-70",
          )}
        />
      ))}
    </div>
  );
}

export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
