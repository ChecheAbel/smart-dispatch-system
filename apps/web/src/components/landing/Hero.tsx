"use client";

import Link from "next/link";
import { ArrowRight, Car, MapPin, Radio } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { goldCtaClass, ghostCtaClass, landingShell } from "@/components/landing/landing-ui";
import { useLandingMessages } from "@/hooks/use-landing-messages";

export default function Hero() {
  const copy = useLandingMessages();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[min(100svh,52rem)] items-center overflow-hidden bg-transparent pt-28 pb-16 sm:pt-32 sm:pb-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,184,122,0.16),transparent_42%),radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.22),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_70%_60%_at_50%_40%,#000_40%,transparent_100%)]" />
      </div>

      <div className={`${landingShell} relative z-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:gap-16`}>
        <div className="max-w-2xl">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-xs font-semibold tracking-[0.22em] text-[var(--brand-accent)] uppercase"
          >
            {copy.hero.titlePrefix}
          </motion.p>
          <span
            className="mb-5 block h-px w-12 bg-[var(--brand-accent)]"
            aria-hidden="true"
          />
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.05 }}
            className="text-4xl leading-[1.12] font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl"
          >
            {copy.hero.titleHighlight}
            <span className="mt-2 block font-medium text-white/88">
              {copy.hero.titleSuffix}
            </span>
          </motion.h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.1 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/82 sm:text-lg"
          >
            {copy.hero.subtitle}
          </motion.p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.16 }}
            className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row"
          >
            <Link href="/book" className={goldCtaClass}>
              {copy.nav.bookNow}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#process" className={ghostCtaClass}>
              {copy.hero.seeHowItWorks}
            </a>
          </motion.div>
        </div>

        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.12 }}
          aria-label={copy.hero.previewTitle}
        >
          <Card className="gap-0 overflow-hidden rounded-3xl border-white/15 bg-[#122622]/85 py-0 text-white shadow-2xl ring-white/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#171c24]/90">
            <div className="h-1 w-full bg-[var(--brand-accent)]" aria-hidden="true" />
            <CardContent className="p-5 sm:p-6">
              <Badge
                variant="outline"
                className="h-auto border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--brand-accent)] uppercase"
              >
                {copy.hero.previewKicker}
              </Badge>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                {copy.hero.previewTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                {copy.hero.previewCaption}
              </p>

              <ul className="mt-5 space-y-3">
                <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15">
                    <Car className="size-5 text-[var(--brand-accent)]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-white">
                      {copy.hero.tripAssigned}
                    </span>
                    <span className="block text-sm text-white/70">
                      {copy.hero.tripAssignedMeta}
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <MapPin className="size-5 text-white" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-white">
                      {copy.hero.tripQueued}
                    </span>
                    <span className="block text-sm text-white/70">
                      {copy.hero.tripQueuedMeta}
                    </span>
                  </span>
                </li>
              </ul>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/65 uppercase">
                    <Radio className="size-3.5" aria-hidden="true" />
                    {copy.hero.boardLabel}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {copy.hero.boardValue}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <dt className="text-xs font-semibold tracking-wide text-white/65 uppercase">
                    {copy.hero.focusLabel}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {copy.hero.focusValue}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </motion.aside>
      </div>
    </section>
  );
}
