"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/shared/providers";
import { DEFAULT_BRAND_LOGO_SRC } from "@/lib/branding";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ className, priority = false }: BrandLogoProps) {
  const { branding, logoSrc } = useBranding();
  const isRemote = logoSrc.startsWith("http://") || logoSrc.startsWith("https://");
  const alt = branding.company_name || "Brand logo";

  if (isRemote) {
    return (
      // Remote upload URLs are served from the API host.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt={alt}
        className={cn("h-8 sm:h-10 w-auto object-contain", className)}
      />
    );
  }

  return (
    <Image
      src={logoSrc || DEFAULT_BRAND_LOGO_SRC}
      alt={alt}
      width={220}
      height={64}
      priority={priority}
      className={cn("h-8 sm:h-10 w-auto object-contain", className)}
    />
  );
}
