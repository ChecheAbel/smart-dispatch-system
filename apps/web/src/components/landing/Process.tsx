"use client";

import { motion } from "framer-motion";
import { Smartphone, Zap, Receipt } from "lucide-react";

const steps = [
  {
    id: "01",
    title: "Book & Request",
    description: "Corporate employees or clients easily request rides via a seamless portal. No complicated tech—just enter the destination and go.",
    icon: Smartphone,
    color: "from-[#C9B87A]/20 to-[#C9B87A]/5",
    iconColor: "text-[#C9B87A]",
  },
  {
    id: "02",
    title: "Smart Assign",
    description: "Our system instantly locates the nearest available and compliant vehicle, minimizing wait times and maximizing fleet efficiency.",
    icon: Zap,
    color: "from-[#C9B87A]/20 to-[#C9B87A]/5",
    iconColor: "text-[#C9B87A]",
  },
  {
    id: "03",
    title: "Track & Bill",
    description: "Monitor the trip in real-time. Once completed, the system automatically generates an accurate ETB invoice for corporate billing.",
    icon: Receipt,
    color: "from-[#C9B87A]/20 to-[#C9B87A]/5",
    iconColor: "text-[#C9B87A]",
  },
];

export default function Process() {
  return (
    <section id="process" className="bg-white py-20 sm:py-28 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C9B87A] opacity-[0.05] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.25em] uppercase mb-4 drop-shadow-sm">Seamless Experience</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C3A34] tracking-tight px-2 drop-shadow-xl">
              How It Works
            </h2>
            <p className="mt-5 text-slate-500 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed px-2 font-light">
              We’ve removed the complexity from fleet operations. Our intuitive three-step process ensures a smooth ride from booking to billing.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          {/* Desktop Connecting Line */}
          <div className="hidden lg:block absolute top-[4rem] left-[10%] right-[10%] h-px bg-slate-200 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 lg:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: i * 0.2 }}
                className="relative bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 group z-10"
              >
                <div className="absolute -top-6 left-8 text-6xl font-black text-slate-100 group-hover:text-slate-200 transition-colors pointer-events-none">
                  {step.id}
                </div>
                
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} border border-slate-100 flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative bg-white`}>
                  <step.icon className={`w-8 h-8 ${step.iconColor}`} />
                </div>
                
                <h3 className="text-2xl font-bold text-[#1C3A34] mb-4 transition-colors">
                  {step.title}
                </h3>
                
                <p className="text-slate-500 leading-relaxed font-light">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
