"use client";

import { motion } from "framer-motion";
import { Smartphone, Zap, Receipt } from "lucide-react";
import { useLandingMessages } from "@/hooks/use-landing-messages";

const STEP_ICONS = [Smartphone, Zap, Receipt] as const;
const STEP_IDS = ["01", "02", "03"] as const;

export default function Process() {
  const copy = useLandingMessages();

  return (
    <section id="process" className="bg-white py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--brand-accent)] opacity-[0.05] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[var(--brand-accent)] font-bold text-[10px] sm:text-xs tracking-[0.25em] uppercase mb-4 drop-shadow-sm">{copy.process.eyebrow}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--brand-primary)] tracking-tight px-2 drop-shadow-xl">
              {copy.process.title}
            </h2>
            <p className="mt-5 text-slate-500 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed px-2 font-light">
              {copy.process.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-[4rem] left-[10%] right-[10%] h-px bg-slate-200 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 lg:gap-8">
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
                  className="relative bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 group z-10"
                >
                  <div className="absolute -top-6 left-8 text-6xl font-black text-slate-100 group-hover:text-slate-200 transition-colors pointer-events-none">
                    {id}
                  </div>
                  
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-accent)]/20 to-[var(--brand-accent)]/5 border border-slate-100 flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative bg-white">
                    <Icon className="w-8 h-8 text-[var(--brand-accent)]" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-4 transition-colors">
                    {step.title}
                  </h3>
                  
                  <p className="text-slate-500 leading-relaxed font-light">
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
