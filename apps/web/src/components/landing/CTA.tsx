"use client";

import { motion } from "framer-motion";
import { useLandingMessages } from "@/hooks/use-landing-messages";

export default function CTA() {
  const copy = useLandingMessages();

  return (
    <section className="relative py-24 sm:py-32 lg:py-40 bg-[var(--brand-primary)] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.05)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.03, 0.08, 0.03],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,100vw)] h-[min(800px,100vw)] bg-[radial-gradient(ellipse_at_center,_var(--brand-accent)_0%,_transparent_70%)] rounded-full blur-[100px] pointer-events-none" 
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/5 backdrop-blur-md mb-6">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-accent)] animate-pulse" />
            <span className="text-[var(--brand-accent)] font-bold text-[10px] sm:text-xs tracking-[0.25em] uppercase">{copy.cta.eyebrow}</span>
          </p>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 sm:mb-8 px-2 drop-shadow-2xl">
            {copy.cta.titlePrefix}{" "}
            <br className="hidden sm:block" />
            <span className="relative inline-block mt-2">
              <span className="bg-gradient-to-r from-[var(--brand-accent)] via-[#FFF2C2] to-[var(--brand-accent)] bg-clip-text text-transparent bg-[length:200%_auto] animate-pulse">
                {copy.cta.titleHighlight}
              </span>
            </span>
          </h2>
          
          <p className="text-white/60 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 sm:mb-12 px-2 font-light">
            {copy.cta.subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md sm:max-w-none mx-auto">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="/book"
              className="relative w-full sm:w-auto bg-gradient-to-b from-[var(--brand-accent)] to-[#A4945A] hover:from-[#d9ca8e] hover:to-[#B6A46A] text-[var(--brand-primary)] font-bold text-[15px] px-10 py-4 sm:py-5 rounded-full tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_-5px_rgba(201,184,122,0.5)] text-center overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                {copy.cta.bookNow}
              </span>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#features"
              className="w-full sm:w-auto border border-white/20 hover:border-[var(--brand-accent)]/50 text-white font-semibold text-[15px] px-10 py-4 sm:py-5 rounded-full tracking-wide transition-all duration-300 hover:bg-white/5 backdrop-blur-md text-center text-lg"
            >
              {copy.cta.exploreFeatures}
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
