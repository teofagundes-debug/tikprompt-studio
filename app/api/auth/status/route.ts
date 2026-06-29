import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { getSessionUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureDatabaseSchema();

  const [user, userCount] = await Promise.all([getSessionUser(), prisma.user.count()]);

  return NextResponse.json({
    user: user ? publicUser(user) : null,
    needsSetup: userCount === 0
  });
}
