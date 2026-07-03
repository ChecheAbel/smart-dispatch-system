import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo.webp"
      alt="Ethiopian Investment Holdings"
      width={220}
      height={64}
      priority={priority}
      className={cn("h-8 sm:h-10 w-auto object-contain", className)}
    />
  );
}
