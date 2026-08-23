"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import BrandLogo from "@/components/landing/BrandLogo";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#process", key: "howItWorks" as const },
  { href: "#features", key: "features" as const },
  { href: "#benefits", key: "benefits" as const },
  { href: "#contact", key: "contact" as const },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B87A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C3A34]";

export default function Navbar() {
  const copy = useLandingMessages();
  const reduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        {copy.skipToContent}
      </a>
      <motion.header
        initial={reduceMotion ? false : { y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 left-0 z-50 px-3 pt-3 sm:px-6"
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-3 py-2.5 transition-[background-color,box-shadow,border-color] duration-300 sm:px-5",
            scrolled
              ? "border border-white/15 bg-[#1C3A34]/92 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1117]/92"
              : "border border-transparent bg-transparent",
          )}
        >
          <Link
            href="/"
            className={cn(
              "flex min-w-0 shrink-0 cursor-pointer items-center rounded-lg",
              focusRing,
            )}
          >
            <BrandLogo priority className="drop-shadow-md" />
          </Link>

          <nav
            aria-label={copy.nav.mainNav}
            className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-white/85 transition-colors duration-200 hover:bg-white/10 hover:text-white",
                  focusRing,
                )}
              >
                {copy.nav[link.key]}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle
              placement="inline"
              className="auth-theme-toggle-inline size-10 cursor-pointer border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-[#C9B87A]"
            />
            <LanguageSwitcher variant="dark" />
            <Link
              href="/book"
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#C9B87A] px-5 text-sm font-bold text-[#1C3A34] transition-colors duration-200 hover:bg-[#d4c48a]",
                focusRing,
              )}
            >
              {copy.nav.bookNow}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={cn(
              "inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white lg:hidden",
              focusRing,
            )}
            aria-label={mobileMenuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-nav"
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#0f1f1c]/80 backdrop-blur-md lg:hidden dark:bg-[#0d1117]/88"
            onClick={closeMobileMenu}
          >
            <div
              id="landing-mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label={copy.nav.mobileNav}
              onClick={(event) => event.stopPropagation()}
              className="absolute top-[5.5rem] right-4 left-4 overflow-hidden rounded-2xl border border-white/15 bg-[#1C3A34] shadow-2xl dark:border-white/10 dark:bg-[#171c24]"
            >
              <nav className="space-y-1 p-3" aria-label={copy.nav.mobileNav}>
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center rounded-xl px-4 text-base font-semibold text-white/90 hover:bg-white/10",
                      focusRing,
                    )}
                  >
                    {copy.nav[link.key]}
                  </a>
                ))}
              </nav>
              <div className="flex items-center justify-center gap-3 px-4 pb-3">
                <ThemeToggle
                  placement="inline"
                  className="auth-theme-toggle-inline size-11 cursor-pointer border border-white/15 bg-white/5 text-white"
                />
                <LanguageSwitcher variant="dark" />
              </div>
              <div className="px-4 pb-4">
                <Link
                  href="/book"
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#C9B87A] text-base font-bold text-[#1C3A34]",
                    focusRing,
                  )}
                >
                  {copy.nav.bookNow}
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
