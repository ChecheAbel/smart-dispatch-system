"use client";

import {
  CalendarCheck,
  Car,
  FileText,
  Radio,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionIntro, landingSection, landingShell } from "@/components/landing/landing-ui";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { cn } from "@/lib/utils";

const FEATURE_ICONS: LucideIcon[] = [
  CalendarCheck,
  Radio,
  Car,
  Users,
  Receipt,
  FileText,
];

const FEATURE_LAYOUT = [
  "lg:col-span-1",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-1",
  "lg:col-span-1",
  "lg:col-span-2",
] as const;

export default function Features() {
  const copy = useLandingMessages();
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      className={`${landingSection} overflow-hidden bg-[var(--brand-primary)] dark:bg-[#0d1117]`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,184,122,0.1)_0%,_transparent_55%)]"
        aria-hidden="true"
      />

      <div className={`relative z-10 ${landingShell}`}>
        <SectionIntro
          invert
          eyebrow={copy.features.eyebrow}
          title={copy.features.title}
          subtitle={copy.features.subtitle}
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {copy.features.items.map((feat, index) => {
            const Icon = FEATURE_ICONS[index];

            return (
              <motion.div
                key={feat.title}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  delay: reduceMotion ? 0 : index * 0.06,
                }}
                className={FEATURE_LAYOUT[index]}
              >
                <Card
                  className={cn(
                    "group h-full gap-0 overflow-hidden rounded-2xl border-white/10 bg-white/5 py-0 text-white shadow-none ring-white/10 backdrop-blur-sm transition-colors hover:border-[var(--brand-accent)]/35 hover:bg-white/[0.07] dark:bg-[#171c24]/80",
                  )}
                >
                  <CardContent className="flex h-full flex-col p-6 sm:p-7">
                    <div className="mb-6 flex items-start justify-between gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 transition-colors group-hover:border-[var(--brand-accent)]/40">
                        <Icon
                          className="size-5 text-white transition-colors group-hover:text-[var(--brand-accent)]"
                          aria-hidden="true"
                        />
                      </span>
                      <Badge
                        variant="outline"
                        className="h-auto border-white/20 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-wider text-white/80 uppercase group-hover:border-[var(--brand-accent)]/50 group-hover:text-[var(--brand-accent)]"
                      >
                        {feat.tag}
                      </Badge>
                    </div>
                    <div className="mt-auto">
                      <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">
                        {feat.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-white/78 sm:text-base">
                        {feat.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
