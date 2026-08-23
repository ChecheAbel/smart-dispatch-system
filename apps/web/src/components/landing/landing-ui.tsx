import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const landingShell = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export const landingSection = "relative scroll-mt-28 py-16 sm:py-20 lg:py-24";

export const goldCtaClass = cn(
  buttonVariants({ size: "lg" }),
  "h-12 cursor-pointer rounded-full bg-[var(--brand-accent)] px-7 text-base font-semibold whitespace-normal text-[var(--brand-primary)] shadow-none hover:bg-[#d4c48a] sm:whitespace-nowrap",
);

export const ghostCtaClass = cn(
  buttonVariants({ size: "lg", variant: "outline" }),
  "h-12 cursor-pointer rounded-full border-white/25 bg-white/5 px-7 text-base font-semibold whitespace-normal text-white hover:border-[var(--brand-accent)]/60 hover:bg-white/10 hover:text-white sm:whitespace-nowrap",
);

export const darkCtaClass = cn(
  buttonVariants({ size: "lg" }),
  "h-12 w-full cursor-pointer rounded-xl bg-[var(--brand-primary)] text-base font-semibold text-white hover:bg-[#244840] dark:bg-[var(--brand-accent)] dark:text-[var(--brand-primary)] dark:hover:bg-[#d4c48a]",
);

export const landingNavLink =
  "cursor-pointer font-medium text-white/75 transition-colors hover:text-[var(--brand-accent)] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:outline-none";

export const landingFieldClass =
  "mt-2 h-12 rounded-xl border-slate-300 bg-white text-base md:text-base dark:border-white/15 dark:bg-[#11161d]";

type SectionIntroProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  invert?: boolean;
  align?: "center" | "start";
  titleId?: string;
  className?: string;
};

export function SectionIntro({
  eyebrow,
  title,
  subtitle,
  invert = false,
  align = "center",
  titleId,
  className,
}: SectionIntroProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        centered ? "mx-auto max-w-3xl text-center" : "max-w-xl text-left",
        className,
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold tracking-[0.22em] uppercase",
          invert ? "text-[var(--brand-accent)]" : "text-[#8a7a42] dark:text-[var(--brand-accent)]",
        )}
      >
        {eyebrow}
      </p>
      <span
        className={cn(
          "mt-3 block h-px w-12",
          centered ? "mx-auto" : "mx-0",
          invert ? "bg-[var(--brand-accent)]/70" : "bg-[var(--brand-accent)]",
        )}
        aria-hidden="true"
      />
      <h2
        id={titleId}
        className={cn(
          "mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-tight",
          invert ? "text-white" : "text-[var(--brand-primary)] dark:text-[#eef1f5]",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-4 max-w-2xl text-base leading-relaxed sm:text-lg",
          centered ? "mx-auto" : "mx-0",
          invert ? "text-white/80" : "text-slate-600 dark:text-[#c5ced8]",
        )}
      >
        {subtitle}
      </p>
    </div>
  );
}
