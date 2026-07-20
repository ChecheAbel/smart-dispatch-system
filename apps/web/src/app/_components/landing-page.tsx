"use client";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Process from "@/components/landing/Process";
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
      <div className="min-h-screen bg-[var(--brand-primary)] text-white antialiased">
        <Navbar />
        <div className="bg-[var(--brand-primary)] animate-landing-page-in">
          <Hero />
        </div>
        <Reveal>
          <Process />
        </Reveal>
        <Reveal delay={80}>
          <Features />
        </Reveal>
        <Reveal delay={80}>
          <Benefits />
        </Reveal>
        <Reveal delay={80}>
          <CTA />
        </Reveal>
        <Reveal delay={80}>
          <Contact />
        </Reveal>
        <Reveal delay={80}>
          <Footer />
        </Reveal>
      </div>
    </LocaleProvider>
  );
}
