import {
  ArrowRight,
  CalendarCheck,
  Car,
  FileText,
  Radio,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const modules: {
  step: string;
  icon: LucideIcon;
  name: string;
  sub: string;
}[] = [
  { step: "01", icon: CalendarCheck, name: "Booking",           sub: "Trip & ride requests" },
  { step: "02", icon: Radio,         name: "Dispatch",          sub: "Real-time assignment" },
  { step: "03", icon: Car,           name: "Fleet Management",  sub: "Vehicles & maintenance" },
  { step: "04", icon: Users,         name: "Driver Management", sub: "Workforce & shifts" },
  { step: "05", icon: Receipt,       name: "Billing",           sub: "Fares & payments" },
  { step: "06", icon: FileText,      name: "Invoicing",         sub: "Automated documents" },
];

export default function Enterprises() {
  return (
    <section id="platform" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3">— Unified Platform —</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C3A34] tracking-tight px-2">
            One System, Full Control
          </h2>
          <p className="mt-3 sm:mt-4 text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            Every module is built in—booking through invoicing, all in one place.
          </p>
        </div>

        <Reveal>
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 shadow-xl sm:shadow-2xl shadow-slate-200/80">
            {/* Panel header — matches console sections */}
            <div className="bg-[#1C3A34] px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="flex gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/70" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/70" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/70" />
                  </div>
                  <span className="text-[#C9B87A] text-[10px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase truncate">
                    Smart Dispatch Platform
                  </span>
                </div>
              </div>
              <p className="text-white/40 text-[10px] sm:text-[11px] font-semibold tracking-wide leading-relaxed">
                Booking → Dispatch → Fleet → Drivers → Billing → Invoice
              </p>
            </div>

            {/* Module flow — desktop */}
            <div className="hidden lg:block bg-[#f8f7f4] px-8 py-10">
              <div className="flex items-start justify-between gap-2">
                {modules.map((mod, index) => (
                  <div key={mod.name} className="flex items-start flex-1 min-w-0">
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className="relative mb-4">
                        <div className="h-[3.25rem] w-[3.25rem] rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                          <mod.icon className="h-5 w-5 text-[#1C3A34]" strokeWidth={2} />
                        </div>
                        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#C9B87A] text-[#1C3A34] text-[9px] font-extrabold flex items-center justify-center">
                          {mod.step}
                        </span>
                      </div>
                      <h3 className="font-bold text-[13px] text-[#1C3A34] leading-tight">{mod.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{mod.sub}</p>
                    </div>
                    {index < modules.length - 1 && (
                      <div className="flex items-center pt-5 px-1 shrink-0">
                        <ArrowRight className="h-4 w-4 text-[#C9B87A]/50" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Module grid — tablet & mobile */}
            <div className="lg:hidden bg-[#f8f7f4] p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 sm:gap-4">
                {modules.map((mod, index) => (
                  <Reveal key={mod.name} delay={index * 60}>
                    <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm h-full">
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 rounded-xl bg-[#1C3A34]/5 flex items-center justify-center">
                          <mod.icon className="h-5 w-5 text-[#1C3A34]" strokeWidth={2} />
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#C9B87A] text-[#1C3A34] text-[8px] font-extrabold flex items-center justify-center">
                          {mod.step}
                        </span>
                      </div>
                      <div className="min-w-0 text-left">
                        <h3 className="font-bold text-sm text-[#1C3A34]">{mod.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{mod.sub}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Bottom summary strip */}
            <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                <span className="font-bold text-[#1C3A34]">6 core modules</span>
                {" "}working together in a single platform
              </p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase">
                  All modules active
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
