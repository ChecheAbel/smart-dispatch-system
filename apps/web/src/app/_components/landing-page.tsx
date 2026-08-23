"use client";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Process, { Proof } from "@/components/landing/Process";
import Features from "@/components/landing/Features";
import Benefits from "@/components/landing/Benefits";
import CTA from "@/components/landing/CTA";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";
import Reveal from "@/components/landing/Reveal";
import { LocaleProvider } from "@/components/shared/providers/locale-context";

export function LandingPage() {
  return (
    <LocaleProvider>
      <div className="min-h-screen scroll-pt-24 bg-[var(--brand-primary)] text-white antialiased dark:bg-[#0d1117] dark:text-[#e8ecf1]">
        <Navbar />
        <main id="main-content">
          <div className="animate-landing-page-in bg-[var(--brand-primary)] dark:bg-[#0d1117]">
            <Hero />
          </div>
          <Reveal>
            <Proof />
          </Reveal>
          <Reveal>
            <Process />
          </Reveal>
          <Reveal>
            <Features />
          </Reveal>
          <Reveal>
            <Benefits />
          </Reveal>
          <Reveal>
            <CTA />
          </Reveal>
          <Reveal>
            <Contact />
          </Reveal>
        </main>
        <Reveal>
          <Footer />
        </Reveal>
      </div>
    </LocaleProvider>
  );
}
