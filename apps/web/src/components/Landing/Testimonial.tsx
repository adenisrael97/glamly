import Image from "next/image";
const testimonials = [
  {
    name: "Sophia Williams",
    job: "Product Manager, Lagos",
    image: "/images/women/women1.jpg",
    text: "Glamly made it so easy to book a stylist for my home. The experience was seamless and professional!",
  },
  {
    name: "James Okafor",
    job: "Software Engineer, Abuja",
    image: "/images/men/men2.jpg",
    text: "I love the flexibility Glamly offers. Whether at home or in the salon, I always get great service.",
  },
  {
    name: "Aisha Bello",
    job: "Entrepreneur, Kano",
    image: "/images/women/women2.jpg",
    text: "Booking a stylist for my home was quick and easy. Glamly connects you to the best professionals!",
  },
  {
    name: "David Smith",
    job: "Consultant, Port Harcourt",
    image: "/images/men/men3.jpg",
    text: "Glamly’s platform is user-friendly and reliable. I can choose home service or salon visits anytime.",
  },
  {
    name: "Chidinma Okeke",
    job: "Designer, Enugu",
    image: "/images/women/women1.jpg",
    text: "The stylists are talented and punctual. Glamly gives me options and convenience!",
  },
  {
    name: "Emeka Nwosu",
    job: "Banker, Ibadan",
    image: "/images/men/men2.jpg",
    text: "I ordered a home haircut through Glamly and it was fantastic. Highly recommended!",
  },
];

export default function Testimonial() {
  return (
    <section className="py-16 bg-linear-to-br from-purple-700 via-purple-500 to-yellow-200">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-white mb-2">What Our Users Say</h2>
        <p className="text-lg text-center text-yellow-200 mb-6">
          Glamly connects you to top stylists for home or salon services. Here’s what our users love about the platform!
        </p>
        <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center transition hover:shadow-2xl border border-purple-100"
            >
              <div className="mb-4 flex items-center justify-center w-32 h-32 rounded-full bg-white border-4 border-yellow-200 shadow-md overflow-hidden">
                <Image
                  src={t.image}
                  alt={t.name}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                  priority={idx === 0}
                />
              </div>
              <h3 className="text-xl font-semibold text-purple-700 mb-1">{t.name}</h3>
              <p className="text-sm text-yellow-700 mb-3">{t.job}</p>
              <p className="text-gray-700 text-center">{t.text}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <a href="/services" className="px-6 py-3 rounded-lg bg-purple-700 text-white font-semibold shadow hover:bg-purple-800 transition">Explore Our Service</a>
          <a href="/book-appointment" className="px-6 py-3 rounded-lg bg-yellow-400 text-purple-900 font-semibold shadow hover:bg-yellow-500 transition">Book Now</a>
        </div>
      </div>
    </section>
  );
}
