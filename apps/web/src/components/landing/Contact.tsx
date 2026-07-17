"use client";

import { useState } from "react";
import { useLandingMessages } from "@/hooks/use-landing-messages";

export default function Contact() {
  const copy = useLandingMessages();
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });

  return (
    <section id="contact" className="bg-[#f8f7f4] py-16 sm:py-20 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3">{copy.contact.eyebrow}</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C3A34] tracking-tight px-2">{copy.contact.title}</h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base leading-relaxed px-2">
            {copy.contact.subtitle}
          </p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-8 md:p-12">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                  {copy.contact.fullName}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder={copy.contact.namePlaceholder}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                  {copy.contact.company}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder={copy.contact.companyPlaceholder}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                {copy.contact.email}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                placeholder={copy.contact.emailPlaceholder}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                {copy.contact.message}
              </label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all resize-none"
                placeholder={copy.contact.messagePlaceholder}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1C3A34] hover:bg-[#162e29] text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5"
            >
              {copy.contact.submit}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
