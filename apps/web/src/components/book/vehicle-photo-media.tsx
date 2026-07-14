"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type VehiclePhotoTone = "light" | "dark";

type VehiclePhotoPlaceholderProps = {
  tone?: VehiclePhotoTone;
  className?: string;
};

export function VehiclePhotoPlaceholder({
  tone = "light",
  className,
}: VehiclePhotoPlaceholderProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2",
        isDark ? "bg-[#152e29] text-white/25" : "bg-slate-100 text-slate-300",
        className,
      )}
      aria-hidden="true"
    >
      <ImageOff className="size-8 sm:size-10" strokeWidth={1.5} />
      <span
        className={cn(
          "text-[11px] font-medium tracking-wide",
          isDark ? "text-white/35" : "text-slate-400",
        )}
      >
        No photo
      </span>
    </div>
  );
}

type VehiclePhotoMediaProps = {
  imageUrl?: string | null;
  alt: string;
  tone?: VehiclePhotoTone;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
};

export function VehiclePhotoMedia({
  imageUrl,
  alt,
  tone = "light",
  className,
  imgClassName,
  placeholderClassName,
}: VehiclePhotoMediaProps) {
  const [hasError, setHasError] = useState(!imageUrl);

  if (hasError || !imageUrl) {
    return (
      <VehiclePhotoPlaceholder
        tone={tone}
        className={cn(className, placeholderClassName)}
      />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={cn("h-full w-full object-cover", className, imgClassName)}
      onError={() => setHasError(true)}
    />
  );
}
