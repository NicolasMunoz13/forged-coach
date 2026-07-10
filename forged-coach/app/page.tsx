import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { Programs } from "@/components/Programs";
import { Nutrition } from "@/components/Nutrition";
import { Proof } from "@/components/Proof";
import { CoachSection } from "@/components/CoachSection";
import { LeadMagnet } from "@/components/LeadMagnet";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Manifesto />
        <Programs />
        <Nutrition />
        <Proof />
        <CoachSection />
        <LeadMagnet />
      </main>
      <Footer />
    </>
  );
}
