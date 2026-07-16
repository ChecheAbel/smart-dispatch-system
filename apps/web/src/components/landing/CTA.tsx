"use client";

import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section className="relative py-24 sm:py-32 lg:py-40 bg-[#1C3A34] overflow-hidden">
      {/* Grid decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.05)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      
      {/* Glow orb */}
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.03, 0.08, 0.03],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,100vw)] h-[min(800px,100vw)] bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_70%)] rounded-full blur-[100px] pointer-events-none" 
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9B87A]/20 bg-[#C9B87A]/5 backdrop-blur-md mb-6">
            <span className="h-2 w-2 rounded-full bg-[#C9B87A] animate-pulse" />
            <span className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.25em] uppercase">Ready to Move?</span>
          </p>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 sm:mb-8 px-2 drop-shadow-2xl">
            Upgrade to Ethiopia's Premium{" "}
            <br className="hidden sm:block" />
            <span className="relative inline-block mt-2">
              <span className="bg-gradient-to-r from-[#C9B87A] via-[#FFF2C2] to-[#C9B87A] bg-clip-text text-transparent bg-[length:200%_auto] animate-pulse">
                Dispatch Platform
              </span>
            </span>
          </h2>
          
          <p className="text-white/60 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 sm:mb-12 px-2 font-light">
            Run bookings, corporate dispatches, fleet compliance, and ETB invoicing from one purpose-built system.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md sm:max-w-none mx-auto">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="/book"
              className="relative w-full sm:w-auto bg-gradient-to-b from-[#C9B87A] to-[#A4945A] hover:from-[#d9ca8e] hover:to-[#B6A46A] text-[#1C3A34] font-bold text-[15px] px-10 py-4 sm:py-5 rounded-full tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_-5px_rgba(201,184,122,0.5)] text-center overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                Book now
              </span>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#features"
              className="w-full sm:w-auto border border-white/20 hover:border-[#C9B87A]/50 text-white font-semibold text-[15px] px-10 py-4 sm:py-5 rounded-full tracking-wide transition-all duration-300 hover:bg-white/5 backdrop-blur-md text-center text-lg"
            >
              Explore Features
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
