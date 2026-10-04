import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Specialities from "@/components/Specialities";
import HowItWorks from "@/components/HowItWorks";
import LocationSection from "@/components/LocationSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Specialities />
        <HowItWorks />
        <LocationSection />
      </main>
      <Footer />
    </div>
  );
}
