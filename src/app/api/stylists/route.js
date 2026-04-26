import { NextResponse } from "next/server";
import stylistsData from "@/data/stylist/stylist.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q")?.toLowerCase() ?? "";
  const service = searchParams.get("service") ?? "";
  const location = searchParams.get("location")?.toLowerCase() ?? "";
  const minRating = parseFloat(searchParams.get("minRating") ?? "0");
  const minPrice = parseInt(searchParams.get("minPrice") ?? "0");
  const maxPrice = parseInt(searchParams.get("maxPrice") ?? "999999");
  const availableOnly = searchParams.get("availableOnly") === "true";
  const sortBy = searchParams.get("sortBy") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(24, parseInt(searchParams.get("pageSize") ?? "6"));

  // Simulate realistic network latency
  await sleep(350 + Math.random() * 150);

  let results = [...stylistsData];

  if (query) {
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.services.some((svc) => svc.toLowerCase().includes(query)) ||
        s.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  if (service) {
    results = results.filter((s) =>
      s.services.some((svc) => svc.toLowerCase().includes(service.toLowerCase()))
    );
  }

  if (location) {
    results = results.filter((s) =>
      s.location.toLowerCase().includes(location)
    );
  }

  if (availableOnly) {
    results = results.filter((s) => s.available);
  }

  results = results.filter(
    (s) => s.rating >= minRating && s.price >= minPrice && s.price <= maxPrice
  );

  if (sortBy === "price-asc") results.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") results.sort((a, b) => b.price - a.price);
  else if (sortBy === "rating-desc") results.sort((a, b) => b.rating - a.rating);
  else if (sortBy === "experience") results.sort((a, b) => b.experience - a.experience);

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const paginated = results.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    data: paginated,
    meta: { total, page, pageSize, totalPages },
  });
}
