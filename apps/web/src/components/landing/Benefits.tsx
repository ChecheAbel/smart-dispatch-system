"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Map, BarChart3 } from "lucide-react";
import { useLandingMessages } from "@/hooks/use-landing-messages";

const BENEFIT_ICONS = [Map, ShieldCheck, BarChart3] as const;

export default function Benefits() {
  const copy = useLandingMessages();

  return (
    <section id="benefits" className="bg-slate-50 py-20 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.25em] uppercase mb-4 drop-shadow-sm">{copy.benefits.eyebrow}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C3A34] tracking-tight px-2 drop-shadow-xl">
              {copy.benefits.title}
            </h2>
            <p className="mt-5 text-slate-500 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed px-2 font-light">
              {copy.benefits.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
          {copy.benefits.items.map((benefit, i) => {
            const Icon = BENEFIT_ICONS[i];

            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: i * 0.2 }}
                className="bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-2xl hover:border-[#C9B87A]/30 transition-all duration-300 group shadow-md"
              >
                <div className="h-16 w-16 rounded-2xl bg-[#C9B87A]/10 border border-[#C9B87A]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_-3px_rgba(201,184,122,0.3)] relative bg-white">
                  <Icon className="h-8 w-8 text-[#C9B87A]" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold text-[#1C3A34] mb-4 leading-tight group-hover:text-[#C9B87A] transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-slate-500 leading-relaxed font-light">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
