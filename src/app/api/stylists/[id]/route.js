import { NextResponse } from "next/server";
import stylistsData from "@/data/stylist/stylist.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function GET(request, { params }) {
  await sleep(300);

  const id = parseInt(params.id);
  const stylist = stylistsData.find((s) => s.id === id);

  if (!stylist) {
    return NextResponse.json({ error: "Stylist not found" }, { status: 404 });
  }

  // Enrich with simulated extra data for the detail page
  const enriched = {
    ...stylist,
    bio: `${stylist.name} is a highly skilled beauty professional based in ${stylist.location}, Lagos. With ${stylist.experience} years of experience, they specialise in ${stylist.services.join(", ")} and have built a loyal clientele through their dedication to quality and client satisfaction.`,
    reviewCount: Math.floor(stylist.rating * 12 + Math.random() * 20),
    completedBookings: Math.floor(stylist.experience * 45 + Math.random() * 80),
    responseTime: ["< 1 hour", "< 2 hours", "Same day"][Math.floor(Math.random() * 3)],
    languages: ["English", "Yoruba"].slice(0, Math.random() > 0.5 ? 2 : 1),
    certifications: stylist.experience >= 5 ? ["Licensed Cosmetologist", "Bridal Specialist"] : [],
    reviews: [
      {
        id: 1,
        author: "Adaeze O.",
        avatar: null,
        rating: 5,
        date: "2 weeks ago",
        text: "Absolutely amazing work! My hair looked exactly how I wanted it. Will definitely book again.",
      },
      {
        id: 2,
        author: "Funmi A.",
        avatar: null,
        rating: 5,
        date: "1 month ago",
        text: "Very professional and skilled. The salon experience was top notch.",
      },
      {
        id: 3,
        author: "Chiamaka B.",
        avatar: null,
        rating: Math.ceil(stylist.rating),
        date: "1 month ago",
        text: "Great service, on time and very attentive. Highly recommend!",
      },
    ],
  };

  return NextResponse.json({ data: enriched });
}
