import dynamic from 'next/dynamic';

// Critical above-the-fold component - load immediately
import Hero from "@/components/Landing/Hero";

// Non-critical components - load when needed
const Service = dynamic(() => import("@/components/Landing/Service"), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse"></div>
});

const ServicesCard = dynamic(() => import("@/components/Landing/ServicesCard"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse"></div>
});

const Collection = dynamic(() => import("@/components/Landing/Collection"), {
  loading: () => <div className="h-48 bg-gray-100 animate-pulse"></div>
});

const Packages = dynamic(() => import("@/components/Landing/Packages"), {
  loading: () => <div className="h-56 bg-gray-100 animate-pulse"></div>
});

const Hairstylists = dynamic(() => import("@/components/Landing/Hairstylists"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse"></div>
});

const Testimonial = dynamic(() => import("@/components/Landing/Testimonial"), {
  loading: () => <div className="h-48 bg-gray-100 animate-pulse"></div>
});

const OurStory = dynamic(() => import("@/components/Landing/OurStory"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse"></div>
});

const Address = dynamic(() => import("@/components/Landing/Address"), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse"></div>
});

const Whatsapp = dynamic(() => import("@/components/Landing/Whatsapp"), {
  loading: () => <div className="h-16 bg-gray-100 animate-pulse"></div>
});

export default function Home() {
  return (
    <div>
      <Hero />
      <Service />
      <ServicesCard />  
      <Collection />
      <Packages />
      <Hairstylists />
      <Testimonial />
      <OurStory />
      <Address />
      <Whatsapp />
    </div>
  );
}
