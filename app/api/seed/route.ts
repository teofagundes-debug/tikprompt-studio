import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { createDefaultLibrary } from "@/lib/default-library";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST() {
  await ensureDatabaseSchema();
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const existing = await prisma.business.count({ where: { userId: user.id } });

  if (existing > 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await createDefaultLibrary(user.id);

  return NextResponse.json({ ok: true });
}
