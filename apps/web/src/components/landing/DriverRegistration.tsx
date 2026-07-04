import { BadgeCheck, Clock3, MapPin, Wallet } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const benefits = [
  {
    icon: MapPin,
    title: "Steady trip flow",
    description: "Get matched to bookings through operator dispatch teams on Smart Dispatch.",
  },
  {
    icon: Wallet,
    title: "Transparent earnings",
    description: "Work with operators that use structured fare plans and billing in one system.",
  },
  {
    icon: Clock3,
    title: "Flexible schedule",
    description: "Apply once, get reviewed, and start driving when your account is activated.",
  },
  {
    icon: BadgeCheck,
    title: "Professional onboarding",
    description: "Your profile is reviewed by administrators before you receive trip assignments.",
  },
] as const;

export default function DriverRegistration() {
  return (
    <section id="drivers" className="bg-[#f8f7f4] py-16 sm:py-20 lg:py-24 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 items-center">
          <Reveal>
            <div>
              <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3">
                — For Drivers —
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C3A34] tracking-tight leading-tight">
                Drive with operators on{" "}
                <span className="text-[#C9B87A]">Smart Dispatch</span>
              </h2>
              <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
                Register as a driver to join the network. Submit your details online and get activated after a quick review by the operations team.
              </p>

              <div className="mt-8">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center border border-slate-300 hover:border-[#1C3A34]/30 text-[#1C3A34] font-semibold text-[15px] px-8 py-3.5 rounded-full tracking-wide transition-all duration-200 hover:bg-white"
                >
                  Talk to Operations
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C3A34]/8 text-[#1C3A34]">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#1C3A34]">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{benefit.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
