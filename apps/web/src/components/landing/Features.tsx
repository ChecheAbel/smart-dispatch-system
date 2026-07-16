"use client";

import {
  CalendarCheck,
  Car,
  FileText,
  Radio,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const features: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag: string;
  className: string;
}[] = [
  {
    icon: CalendarCheck,
    title: "Booking",
    desc: "Capture ride and delivery requests, manage availability, and confirm trips with instant scheduling rules.",
    tag: "Operations",
    className: "lg:col-span-1",
  },
  {
    icon: Radio,
    title: "Live Dispatch",
    desc: "Assign the right vehicle and driver in real time with live map visibility, route optimization, and granular status tracking.",
    tag: "Core",
    className: "lg:col-span-2",
  },
  {
    icon: Car,
    title: "Fleet Compliance",
    desc: "Monitor vehicle inspections, insurance renewal deadlines, and regional permits with automated compliance alerts.",
    tag: "Fleet",
    className: "lg:col-span-2",
  },
  {
    icon: Users,
    title: "Driver Management",
    desc: "Onboard drivers, track performance and availability, manage shifts, and enforce local safety standards.",
    tag: "Workforce",
    className: "lg:col-span-1",
  },
  {
    icon: Receipt,
    title: "ETB Corporate Billing",
    desc: "Manage custom corporate agreements, calculate region-based pricing, and track account balances in Birr.",
    tag: "Finance",
    className: "lg:col-span-1",
  },
  {
    icon: FileText,
    title: "Automated Invoices",
    desc: "Generate, send, and reconcile localized PDF invoices automatically, tied to completed corporate ride logs.",
    tag: "Finance",
    className: "lg:col-span-2",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[#1C3A34] py-20 sm:py-28 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,184,122,0.1)_0%,_#1C3A34_100%)] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.25em] uppercase mb-4 drop-shadow-md">
              Platform Capabilities
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight px-2 drop-shadow-2xl">
              Everything You Need to Operate
            </h2>
            <p className="mt-5 text-white/60 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed px-2 font-light">
              One complete platform covering the full mobility lifecycle, from the first booking to the final invoice.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feat, index) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: index * 0.1, ease: "easeOut" }}
              className={cn(
                "group relative bg-[#1C3A34]/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-[#C9B87A]/40 hover:shadow-[0_20px_40px_-15px_rgba(201,184,122,0.2)]",
                feat.className
              )}
            >
              {/* Radial gradient hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-[#1C3A34] to-[#122622] flex items-center justify-center border border-white/10 group-hover:border-[#C9B87A]/50 transition-colors duration-500 shrink-0 shadow-inner">
                    <feat.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white group-hover:text-[#C9B87A] transition-colors duration-500" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold border border-white/20 text-white/80 bg-white/5 px-3 py-1.5 rounded-full tracking-wider uppercase shrink-0 backdrop-blur-md group-hover:border-[#C9B87A]/50 group-hover:text-[#C9B87A] transition-colors duration-500">
                    {feat.tag}
                  </span>
                </div>
                
                <div className="mt-auto">
                  <h3 className="font-extrabold text-xl sm:text-2xl text-white mb-3 tracking-tight group-hover:text-[#C9B87A] transition-colors duration-500">{feat.title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm sm:text-base font-light">{feat.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
