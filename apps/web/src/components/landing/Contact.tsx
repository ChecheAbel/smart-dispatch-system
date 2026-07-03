"use client";

import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    enterprise: "ESLSE Shipping & Logistics",
    email: "",
    message: "",
  });

  return (
    <section id="contact" className="bg-[#f8f7f4] py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Get in Touch —</p>
          <h2 className="text-4xl font-extrabold text-[#1C3A34] tracking-tight">Operations Support</h2>
          <p className="mt-3 text-slate-500 leading-relaxed">
            Submit integration requests, fleet diagnostic reports, or onboarding inquiries to the EIH Smart Dispatch team.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 md:p-12">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder="Abebe Kebede"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                  Subsidiary Enterprise
                </label>
                <select
                  value={formData.enterprise}
                  onChange={(e) => setFormData({ ...formData, enterprise: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all appearance-none"
                >
                  <option>ESLSE Shipping &amp; Logistics</option>
                  <option>Ethiopian Airlines Group</option>
                  <option>Ethio Telecom Operations</option>
                  <option>Corporate Fleet Management</option>
                  <option>Other EIH Subsidiary</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                Official Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                placeholder="abebe.kebede@eih.et"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                Inquiry / Integration Request
              </label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all resize-none"
                placeholder="Describe your fleet system, dry-port API integration needs, or access request…"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1C3A34] hover:bg-[#162e29] text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5"
            >
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
