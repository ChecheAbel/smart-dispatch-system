"use client";

import { CreditCard } from "lucide-react";
import type { PaymentGatewayMethod } from "@smart-dispatch/types";
import { methodLogoSrc } from "@/lib/payment-gateway";
import { cn } from "@/lib/utils";

type PaymentMethodLogoProps = {
  method: PaymentGatewayMethod;
  size?: "sm" | "md";
  className?: string;
};

export function PaymentMethodLogo({
  method,
  size = "sm",
  className,
}: PaymentMethodLogoProps) {
  const src = methodLogoSrc(method);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={method.name}
        className={cn(
          "w-auto object-contain object-left",
          size === "sm" ? "h-7 max-w-[7.5rem] sm:h-8" : "h-9 max-w-[9rem]",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center text-[var(--brand-primary)]",
        size === "sm" ? "h-7" : "h-9",
        className,
      )}
    >
      <CreditCard className={size === "sm" ? "size-5" : "size-6"} />
    </div>
  );
}
