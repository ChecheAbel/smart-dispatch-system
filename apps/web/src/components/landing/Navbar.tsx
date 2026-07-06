"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/landing/BrandLogo";
import { USER_SIGN_IN_PATH } from "@/lib/auth-paths";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Console", href: "#live-view" },
  { label: "Platform", href: "#platform" },
  { label: "Contact", href: "#contact" },
] as const;

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((link) => link.href.slice(1));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          const next = visible[0].target.id;
          setActiveSection((prev) => (prev === next ? prev : next));
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b border-white/10 bg-[#1C3A34]/95 shadow-lg shadow-black/10 backdrop-blur-md"
            : "border-b border-transparent bg-[#1C3A34]",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center group shrink-0 min-w-0">
            <BrandLogo priority className="group-hover:opacity-90 transition-opacity" />
          </a>

          {/* Desktop nav — centered pill */}
          <nav
            aria-label="Main navigation"
            className="hidden lg:flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1"
          >
            {NAV_LINKS.map((link) => {
              const id = link.href.slice(1);
              const isActive = activeSection === id;

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-200",
                    isActive
                      ? "text-[#1C3A34] bg-[#C9B87A] shadow-sm shadow-[#C9B87A]/20"
                      : "text-white/65 hover:text-white hover:bg-white/8",
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Link
              href={USER_SIGN_IN_PATH}
              className="inline-flex items-center gap-2 bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-[13px] px-5 py-2.5 rounded-full tracking-wide transition-all duration-200 hover:shadow-lg hover:shadow-[#C9B87A]/25 hover:-translate-y-px"
            >
              Book now
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay — only mounted while open to avoid blocking scroll */}
      {mobileMenuOpen && (
      <div
        className="fixed inset-0 z-40 lg:hidden"
        aria-hidden={false}
      >
        <button
          type="button"
          className="absolute inset-0 bg-[#0f1f1c]/80 backdrop-blur-sm"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />

        <div className="absolute top-[72px] left-0 right-0 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-white/10 bg-[#162e29] shadow-2xl">
          <nav className="px-4 py-5 space-y-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => {
              const id = link.href.slice(1);
              const isActive = activeSection === id;

              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-[#C9B87A]/15 text-[#C9B87A] border border-[#C9B87A]/25"
                      : "text-white/80 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C9B87A]" />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="px-4 pb-6 pt-2 border-t border-white/10 space-y-2">
            <Link
              href={USER_SIGN_IN_PATH}
              onClick={closeMobileMenu}
              className="flex items-center justify-center w-full bg-[#C9B87A] text-[#1C3A34] font-bold text-sm py-3.5 rounded-xl hover:bg-[#d9ca8e] transition-colors"
            >
              Book now
            </Link>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
