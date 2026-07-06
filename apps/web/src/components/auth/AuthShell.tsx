import type { ReactNode } from "react";
import BrandLogo from "@/components/landing/BrandLogo";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  mobileTitle: string;
  desktopEyebrow: string;
  desktopTitle: ReactNode;
  desktopDescription: string;
  desktopAside?: ReactNode;
  contentClassName?: string;
  contentAlign?: "center" | "start";
};

export default function AuthShell({
  children,
  mobileTitle,
  desktopEyebrow,
  desktopTitle,
  desktopDescription,
  desktopAside,
  contentClassName = "max-w-md",
  contentAlign = "center",
}: AuthShellProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between overflow-hidden bg-[#1C3A34] p-10 xl:p-14">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.9)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.9)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9B87A] opacity-[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo priority className="h-10" />
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase">{desktopEyebrow}</p>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
            {desktopTitle}
          </h1>
          <p className="text-white/55 text-lg leading-relaxed">{desktopDescription}</p>
          {desktopAside}
        </div>

        <p className="relative z-10 text-white/25 text-xs">
          &copy; {new Date().getFullYear()} Ethiopian Investment Holdings
        </p>
      </div>

      <div className="flex-1 flex flex-col min-h-[100dvh] bg-[#f8f7f4] overflow-y-auto">
        <div className="lg:hidden relative overflow-hidden bg-[#1C3A34] px-4 sm:px-6 py-8 text-center">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.04)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <BrandLogo priority className="h-9" />
            <p className="text-[#C9B87A] font-bold text-[10px] tracking-[0.2em] uppercase">{mobileTitle}</p>
          </div>
        </div>

        <div
          className={cn(
            "flex-1 flex px-5 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-12",
            contentAlign === "start" ? "items-start" : "items-center",
          )}
        >
          <div className={cn("w-full", contentClassName)}>{children}</div>
        </div>
      </div>
    </div>
  );
}
