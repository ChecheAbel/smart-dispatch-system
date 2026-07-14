import {
  CalendarCheck,
  Car,
  FileText,
  Radio,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const features: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag: string;
}[] = [
  {
    icon: CalendarCheck,
    title: "Booking",
    desc: "Capture ride and delivery requests, manage availability, and confirm trips with instant scheduling rules.",
    tag: "Operations",
  },
  {
    icon: Radio,
    title: "Dispatch",
    desc: "Assign the right vehicle and driver in real time with live map visibility, route optimization, and status tracking.",
    tag: "Core",
  },
  {
    icon: Car,
    title: "Fleet Compliance",
    desc: "Monitor vehicle inspections, insurance renewal deadlines, and regional permits with automated compliance alerts.",
    tag: "Fleet",
  },
  {
    icon: Users,
    title: "Driver Management",
    desc: "Onboard drivers, track performance and availability, manage shifts, and enforce local safety standards.",
    tag: "Workforce",
  },
  {
    icon: Receipt,
    title: "ETB Corporate Billing",
    desc: "Manage custom corporate agreements, calculate region-based pricing, and track account balances in Birr.",
    tag: "Finance",
  },
  {
    icon: FileText,
    title: "Automated Invoices",
    desc: "Generate, send, and reconcile localized PDF invoices automatically, tied to completed corporate ride logs.",
    tag: "Finance",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[#f8f7f4] py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3">Platform Capabilities</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C3A34] tracking-tight px-2">
            Everything You Need to Operate
          </h2>
          <p className="mt-3 sm:mt-4 text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            One complete platform covering the full mobility lifecycle, from the first booking to the final invoice.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {features.map((feat, index) => (
            <Reveal key={feat.title} delay={index * 90}>
            <div
              className="group bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-[#C9B87A]/30 transition-all duration-300 hover:-translate-y-1 h-full"
            >
              <div className="flex items-start justify-between mb-4 sm:mb-5 gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-[#1C3A34]/5 group-hover:bg-[#1C3A34]/10 flex items-center justify-center transition-colors duration-300 shrink-0">
                  <feat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#1C3A34] group-hover:text-[#C9B87A] transition-colors" />
                </div>
                <span className="text-[10px] font-bold border border-[#C9B87A]/30 text-[#C9B87A] bg-[#C9B87A]/5 px-2.5 py-1 rounded-full tracking-wider uppercase shrink-0">
                  {feat.tag}
                </span>
              </div>
              <h3 className="font-bold text-lg sm:text-xl text-[#1C3A34] mb-2 sm:mb-3">{feat.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm sm:text-[15px]">{feat.desc}</p>
            </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
