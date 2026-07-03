import Navbar      from "@/components/landing/Navbar";
import Hero        from "@/components/landing/Hero";
import LiveView    from "@/components/landing/LiveView";
import Features    from "@/components/landing/Features";
import Enterprises from "@/components/landing/Enterprises";
import CTA         from "@/components/landing/CTA";
import Contact     from "@/components/landing/Contact";
import Footer      from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] antialiased">
      <Navbar />
      <Hero />
      <LiveView />
      <Features />
      <Enterprises />
      <CTA />
      <Contact />
      <Footer />
    </div>
  );
}
