"use client";

import { motion } from "framer-motion";
import { Smartphone, Zap, Receipt } from "lucide-react";
import { useLandingMessages } from "@/hooks/use-landing-messages";

const STEP_ICONS = [Smartphone, Zap, Receipt] as const;
const STEP_IDS = ["01", "02", "03"] as const;

export default function Process() {
  const copy = useLandingMessages();

  return (
    <section id="process" className="relative overflow-hidden bg-white py-20 sm:py-28 dark:bg-[#0d1117]">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-accent)] opacity-[0.05] blur-[150px] dark:opacity-[0.08]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-[10px] font-bold tracking-[0.25em] text-[var(--brand-accent)] uppercase drop-shadow-sm sm:text-xs">{copy.process.eyebrow}</p>
            <h2 className="px-2 text-3xl font-extrabold tracking-tight text-[var(--brand-primary)] drop-shadow-xl sm:text-4xl lg:text-5xl dark:text-[#eef1f5]">
              {copy.process.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl px-2 text-base leading-relaxed font-light text-slate-500 sm:text-lg lg:text-xl dark:text-[#8f99a6]">
              {copy.process.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="relative">
          <div className="absolute top-[4rem] right-[10%] left-[10%] hidden h-px -translate-y-1/2 bg-slate-200 lg:block dark:bg-white/10" />
          
          <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-3 lg:gap-8">
            {copy.process.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              const id = STEP_IDS[i];

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, delay: i * 0.2 }}
                  className="group relative z-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-2xl sm:p-10 dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 dark:hover:border-[#C9B87A]/25"
                >
                  <div className="pointer-events-none absolute -top-6 left-8 text-6xl font-black text-slate-100 transition-colors group-hover:text-slate-200 dark:text-white/5 dark:group-hover:text-white/10">
                    {id}
                  </div>
                  
                  <div className="relative mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-gradient-to-br from-[var(--brand-accent)]/20 to-[var(--brand-accent)]/5 bg-white shadow-sm transition-transform duration-300 group-hover:scale-110 dark:border-white/10 dark:bg-[#11161d]">
                    <Icon className="h-8 w-8 text-[var(--brand-accent)]" />
                  </div>
                  
                  <h3 className="mb-4 text-2xl font-bold text-[var(--brand-primary)] transition-colors dark:text-[#eef1f5]">
                    {step.title}
                  </h3>
                  
                  <p className="leading-relaxed font-light text-slate-500 dark:text-[#8f99a6]">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
