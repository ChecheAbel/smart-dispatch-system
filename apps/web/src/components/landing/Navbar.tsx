"use client";

import { useState } from "react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1C3A34] shadow-lg">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative h-11 w-11 rounded-full border-2 border-[#C9B87A]/50 flex items-center justify-center bg-[#C9B87A]/10 group-hover:border-[#C9B87A] transition-all duration-300">
            <span className="text-[#C9B87A] font-bold text-lg leading-none">E</span>
          </div>
          <div className="leading-tight">
            <span className="font-bold text-[11px] tracking-[0.2em] uppercase text-white block">Ethiopian Investment</span>
            <span className="font-bold text-[10px] tracking-[0.25em] uppercase text-[#C9B87A] block -mt-0.5">Holdings · Smart Dispatch</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {["Features", "Live View", "Enterprises", "Support"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(" ", "-")}`}
              className="text-[13px] font-semibold text-white/70 hover:text-[#C9B87A] tracking-wide transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-white/60 hover:text-[#C9B87A] transition-colors tracking-wide"
          >
            API Docs
          </a>
          <a
            href="#contact"
            className="bg-[#C9B87A] hover:bg-[#d4c487] text-[#1C3A34] font-bold text-[13px] px-5 py-2.5 rounded-full tracking-wide transition-all duration-200 hover:shadow-lg hover:shadow-[#C9B87A]/20"
          >
            Request Access
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
          <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
          <div className={`w-5 h-0.5 bg-white transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#162e29] border-t border-white/10 px-6 py-4 space-y-3">
          {["Features", "Live View", "Enterprises", "Support"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(" ", "-")}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-white/80 hover:text-[#C9B87A] py-1"
            >
              {link}
            </a>
          ))}
          <a
            href="#contact"
            className="block mt-4 bg-[#C9B87A] text-[#1C3A34] font-bold text-sm px-5 py-2.5 rounded-full text-center"
          >
            Request Access
          </a>
        </div>
      )}
    </header>
  );
}
