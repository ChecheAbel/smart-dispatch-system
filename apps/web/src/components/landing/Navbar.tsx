"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/landing/BrandLogo";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { motion, AnimatePresence } from "framer-motion";

const NAV_HREFS = [
  { key: "howItWorks" as const, href: "#process" },
  { key: "features" as const, href: "#features" },
  { key: "benefits" as const, href: "#benefits" },
  { key: "contact" as const, href: "#contact" },
];

export default function Navbar() {
  const copy = useLandingMessages();
  const navLinks = useMemo(
    () => NAV_HREFS.map((link) => ({ ...link, label: copy.nav[link.key] })),
    [copy.nav],
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;

      const activeLink = navLinks.find((link) => {
        const section = document.getElementById(link.href.slice(1));
        if (!section) return false;

        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;

        return scrollPosition >= top && scrollPosition < bottom;
      });

      if (activeLink) {
        setActiveSection(activeLink.href.slice(1));
      } else if (window.scrollY < 100) {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navLinks]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500",
          scrolled ? "pt-4" : "pt-0"
        )}
      >
        <div 
          className={cn(
            "mx-auto flex items-center justify-between transition-all duration-500",
            scrolled 
              ? "max-w-5xl px-4 sm:px-6 h-16 rounded-full border border-white/20 bg-[#1C3A34]/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl" 
              : "max-w-7xl px-4 sm:px-6 h-[72px] bg-transparent border-transparent"
          )}
        >
          <a href="/" className="flex items-center group shrink-0 min-w-0 z-10">
            <BrandLogo priority className="group-hover:opacity-80 transition-opacity drop-shadow-md" />
          </a>

          <nav
            aria-label={copy.nav.mainNav}
            className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md"
          >
            {navLinks.map((link) => {
              const id = link.href.slice(1);
              const isActive = activeSection === id;

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-5 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-colors z-10 group"
                >
                  <span className={cn("relative z-10", isActive ? "text-[#1C3A34]" : "text-white/70 group-hover:text-white")}>
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-[#C9B87A] to-[#E3D18F] shadow-[0_0_15px_-3px_rgba(201,184,122,0.4)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0 z-10">
            <LanguageSwitcher variant="dark" />
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#C9B87A] hover:bg-[#E3D18F] text-[#1C3A34] font-bold text-[13px] px-6 py-2.5 rounded-full tracking-wide transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(201,184,122,0.5)] hover:-translate-y-0.5"
            >
              {copy.nav.bookNow}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"
            aria-label={mobileMenuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
            aria-expanded={mobileMenuOpen}
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <Menu className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] lg:hidden bg-[#0f1f1c]/90 backdrop-blur-xl"
            aria-hidden={false}
          >
            <div className="absolute top-[90px] left-4 right-4 bg-[#1C3A34]/80 border border-white/20 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">
              <nav className="px-4 py-6 space-y-2" aria-label={copy.nav.mobileNav}>
                {navLinks.map((link, i) => {
                  const id = link.href.slice(1);
                  const isActive = activeSection === id;

                  return (
                    <motion.a
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={link.href}
                      href={link.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex items-center justify-between px-5 py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98]",
                        isActive
                          ? "bg-gradient-to-r from-[#C9B87A]/20 to-transparent text-[#C9B87A] border border-[#C9B87A]/30 shadow-inner"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {link.label}
                      {isActive && (
                        <motion.span layoutId="mobile-indicator" className="h-2 w-2 rounded-full bg-[#C9B87A] shadow-[0_0_10px_rgba(201,184,122,0.8)]" />
                      )}
                    </motion.a>
                  );
                })}
              </nav>

              <div className="px-4 pb-6 pt-2 space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex justify-center"
                >
                  <LanguageSwitcher variant="dark" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Link
                    href="/book"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center w-full bg-gradient-to-r from-[#C9B87A] to-[#A4945A] text-[#1C3A34] font-bold text-base py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
                  >
                    {copy.nav.bookNow}
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
