import { NextResponse } from "next/server";
import servicesData from "@/data/services.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") ?? "";
  const query = searchParams.get("q")?.toLowerCase() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(48, parseInt(searchParams.get("pageSize") ?? "8"));

  await sleep(250 + Math.random() * 100);

  let results = [...servicesData];

  if (category && category !== "All") {
    results = results.filter((s) => s.category === category);
  }

  if (query) {
    results = results.filter((s) => s.name.toLowerCase().includes(query));
  }

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const paginated = results.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    data: paginated,
    meta: { total, page, pageSize, totalPages },
  });
}
