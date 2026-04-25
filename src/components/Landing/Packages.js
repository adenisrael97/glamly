import React from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";

const packages = [
  {
    title: "Bridal Pro",
    desc: "The ultimate bridal experience: premium hairstyles, flawless makeup, lush lashes, elegant nails, and touch-ups for your big day.",
    img: "/images/women/women1.jpg",
  },
  {
    title: "Basic Glow",
    desc: "A quick, flawless look for everyday radiance. Includes simple hairstyles, natural makeup, and a touch of glam for lashes and nails.",
    img: "/images/women/women2.jpg",
  },
  {
    title: "Glam Queen",
    desc: "Go bold with our signature glam—dramatic hairstyles, statement makeup, voluminous lashes, dazzling nails, and more.",
    img: "/images/men/men1.jpg",
  },
  {
    title: "Family Package",
    desc: "Perfect for special occasions! Treat your loved ones to group hairstyles, makeup, lashes, nails, and more. Enjoy a shared glam experience for the whole family.",
    img: "/images/men/men2.jpg",
  },
];

export default function Packages() {
  return (
    <section className="py-12 px-4">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-purple-600 mb-2">Packages</h2>
        <p className="text-lg text-gray-700 max-w-xl mx-auto">
          Discover our curated packages at Glamly, designed to suit every occasion and style.
          Whether you&apos;re seeking a subtle glow or a full glam transformation, our expert team
          has you covered.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {packages.map((pkg) => (
          <div
            key={pkg.title}
            className="bg-white rounded-2xl shadow-lg w-64 flex flex-col items-center overflow-hidden border border-gray-200 hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="relative w-full h-44">
              <Image
                src={pkg.img}
                alt={pkg.title}
                fill
                sizes="(max-width: 640px) 100vw, 256px"
                className="object-cover object-center"
              />
            </div>
            <div className="p-5 flex flex-col flex-1 w-full">
              <h3 className="text-xl font-semibold mb-2 text-purple-700">{pkg.title}</h3>
              <p className="text-base text-gray-700 mb-4 flex-1">{pkg.desc}</p>
              <Button href="/book-appointment" variant="primary" size="md" className="w-full justify-center">
                Book Package
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
