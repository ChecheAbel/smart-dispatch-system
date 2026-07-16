"use client";

import { motion } from "framer-motion";
import { Car, Activity, MapPin } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[100dvh] flex items-center justify-center overflow-hidden bg-transparent pt-24 sm:pt-32 pb-12 sm:pb-16 -mt-px">
      {/* Animated Background Mesh Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_50%)] rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.1, 0.05],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-[radial-gradient(ellipse_at_center,_#1C3A34_0%,_transparent_50%)] rounded-full blur-[100px]"
        />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)] opacity-50" />
      </div>

      {/* Floating Glass UI Elements */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] left-[10%] bg-[#122622]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-full bg-[#C9B87A]/20 flex items-center justify-center">
            <Car className="h-5 w-5 text-[#C9B87A]" />
          </div>
          <div>
            <div className="h-2 w-16 bg-white/20 rounded mb-2" />
            <div className="h-2 w-10 bg-white/10 rounded" />
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[40%] right-[10%] bg-[#122622]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="h-2 w-20 bg-white/20 rounded mb-2" />
            <div className="h-2 w-12 bg-white/10 rounded" />
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[25%] left-[15%] bg-[#122622]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="h-2 w-14 bg-white/20 rounded mb-2" />
            <div className="h-2 w-8 bg-white/10 rounded" />
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center justify-center h-full gap-8 sm:gap-12">
        
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-4xl leading-[1.1] sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-5xl drop-shadow-2xl"
        >
          Ethiopia's Premier{" "}
          <br className="hidden sm:block" />
          <span className="relative inline-block mt-2 sm:mt-4">
            <span className="bg-gradient-to-r from-[#C9B87A] via-[#FFF2C2] to-[#C9B87A] bg-clip-text text-transparent bg-[length:200%_auto] animate-pulse">
              Corporate Dispatch
            </span>
            <motion.span 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
              className="absolute -bottom-2 lg:-bottom-4 left-0 right-0 h-[3px] lg:h-[4px] bg-gradient-to-r from-transparent via-[#C9B87A] to-transparent origin-left rounded-full" 
            />
          </span>
          <br className="hidden sm:block" /> & Fleet Platform
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg sm:text-xl lg:text-2xl text-white/70 max-w-3xl leading-relaxed font-light tracking-wide px-4"
        >
          A localized, enterprise-grade platform for corporate contracts, booking dispatches, driver shifts, and ETB invoicing, built specifically for Ethiopian transport agencies.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-5 sm:gap-8 justify-center w-full max-w-md sm:max-w-none sm:w-auto mt-6"
        >
          <a
            href="#process"
            className="group relative w-full sm:w-auto bg-gradient-to-b from-[#C9B87A] to-[#A4945A] hover:from-[#d9ca8e] hover:to-[#B6A46A] text-[#1C3A34] font-bold text-[17px] px-10 py-4 sm:py-5 rounded-full tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_-5px_rgba(201,184,122,0.5)] hover:-translate-y-1 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              See How It Works
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto border border-white/20 hover:border-[#C9B87A]/50 text-white font-semibold text-[17px] px-10 py-4 sm:py-5 rounded-full tracking-wide transition-all duration-300 hover:bg-white/5 backdrop-blur-md text-center hover:-translate-y-1"
          >
            Explore Features
          </a>
        </motion.div>
      </div>


    </section>
  );
}
