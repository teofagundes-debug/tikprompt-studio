import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  await ensureDatabaseSchema();

  const body = await request.json();
  const name = String(body.name ?? "Novo negocio").trim() || "Novo negocio";
  const niche = String(body.niche ?? "TikTok Shop").trim() || "TikTok Shop";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const business = await prisma.business.create({
    data: {
      name,
      niche,
      initials: initials || "TN",
      color: "#f5c84c",
      products: {
        create: [{ name: "Novo produto" }]
      }
    },
    include: { products: { include: { prompts: true } } }
  });

  return NextResponse.json({ business });
}
