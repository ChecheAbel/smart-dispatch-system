"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { goldCtaClass, ghostCtaClass, landingSection, landingShell } from "@/components/landing/landing-ui";
import { useLandingMessages } from "@/hooks/use-landing-messages";

export default function CTA() {
  const copy = useLandingMessages();
  const reduceMotion = useReducedMotion();

  return (
    <section className={`${landingSection} bg-white dark:bg-[#0d1117]`}>
      <div className={landingShell}>
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--brand-accent)]/25 bg-[var(--brand-primary)] px-6 py-14 sm:px-12 sm:py-16 lg:px-16 dark:bg-[#122018]">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.08)_1px,transparent_1px)] bg-size-[4.5rem_4.5rem] opacity-40"
            aria-hidden="true"
          />
          {reduceMotion ? null : (
            <motion.div
              animate={{ opacity: [0.05, 0.12, 0.05] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute top-1/2 left-1/2 size-[min(36rem,100vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--brand-accent)_0%,transparent_70%)] blur-[100px]"
              aria-hidden="true"
            />
          )}

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduceMotion ? 0 : 0.5 }}
            className="relative z-10 mx-auto max-w-3xl text-center"
          >
            <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-[var(--brand-accent)] uppercase">
              {copy.cta.eyebrow}
            </p>
            <span
              className="mx-auto mb-5 block h-px w-12 bg-[var(--brand-accent)]/70"
              aria-hidden="true"
            />
            <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance text-white sm:text-4xl lg:text-[2.75rem]">
              {copy.cta.titlePrefix}{" "}
              <span className="text-[var(--brand-accent)]">{copy.cta.titleHighlight}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              {copy.cta.subtitle}
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
              <Link href="/book" className={goldCtaClass}>
                {copy.cta.bookNow}
              </Link>
              <a href="#features" className={ghostCtaClass}>
                {copy.cta.exploreFeatures}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
