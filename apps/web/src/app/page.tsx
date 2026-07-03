import Navbar      from "@/components/landing/Navbar";
import Hero        from "@/components/landing/Hero";
import LiveView    from "@/components/landing/LiveView";
import Features    from "@/components/landing/Features";
import Enterprises from "@/components/landing/Enterprises";
import CTA         from "@/components/landing/CTA";
import Contact     from "@/components/landing/Contact";
import Footer      from "@/components/landing/Footer";
import Reveal      from "@/components/landing/Reveal";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] antialiased animate-landing-page-in overflow-x-hidden">
      <Navbar />
      <Hero />
      <Reveal>
        <LiveView />
      </Reveal>
      <Reveal delay={80}>
        <Features />
      </Reveal>
      <Reveal delay={80}>
        <Enterprises />
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
  );
}
