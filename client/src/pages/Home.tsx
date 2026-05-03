import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import Services from "../components/Services";
import Testimonials from "../components/Testimonials";
import MapSection from "../components/Contact";
import Footer from "../components/Footer";
import WhyChooseUs from "../components/WhyChooseUs";


export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Testimonials />
      <MapSection />
      <WhyChooseUs />
      <Footer />
    </>
  );
}