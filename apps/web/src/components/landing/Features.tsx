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
import { useLandingMessages } from "@/hooks/use-landing-messages";

const FEATURE_ICONS: LucideIcon[] = [
  CalendarCheck,
  Radio,
  Car,
  Users,
  Receipt,
  FileText,
];

const FEATURE_LAYOUT = [
  "lg:col-span-1",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-1",
  "lg:col-span-1",
  "lg:col-span-2",
] as const;

export default function Features() {
  const copy = useLandingMessages();

  return (
    <section id="features" className="relative overflow-hidden bg-[var(--brand-primary)] py-20 sm:py-28 dark:bg-[#0d1117]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,184,122,0.1)_0%,_var(--brand-primary)_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(201,184,122,0.12)_0%,_#0d1117_100%)]" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-[10px] font-bold tracking-[0.25em] text-[var(--brand-accent)] uppercase drop-shadow-md sm:text-xs">
              {copy.features.eyebrow}
            </p>
            <h2 className="px-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-2xl sm:text-4xl lg:text-5xl dark:text-[#eef1f5]">
              {copy.features.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl px-2 text-base leading-relaxed font-light text-white/60 sm:text-lg lg:text-xl dark:text-[#8f99a6]">
              {copy.features.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {copy.features.items.map((feat, index) => {
            const Icon = FEATURE_ICONS[index];

            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: index * 0.1, ease: "easeOut" }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--brand-primary)]/40 p-6 shadow-2xl backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--brand-accent)]/40 hover:shadow-[0_20px_40px_-15px_rgba(201,184,122,0.2)] sm:p-8 dark:border-white/10 dark:bg-[#171c24]/80 dark:shadow-black/30",
                  FEATURE_LAYOUT[index],
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[#122622] flex items-center justify-center border border-white/10 group-hover:border-[var(--brand-accent)]/50 transition-colors duration-500 shrink-0 shadow-inner">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white group-hover:text-[var(--brand-accent)] transition-colors duration-500" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold border border-white/20 text-white/80 bg-white/5 px-3 py-1.5 rounded-full tracking-wider uppercase shrink-0 backdrop-blur-md group-hover:border-[var(--brand-accent)]/50 group-hover:text-[var(--brand-accent)] transition-colors duration-500">
                      {feat.tag}
                    </span>
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="font-extrabold text-xl sm:text-2xl text-white mb-3 tracking-tight group-hover:text-[var(--brand-accent)] transition-colors duration-500">{feat.title}</h3>
                    <p className="text-white/60 leading-relaxed text-sm sm:text-base font-light">{feat.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
