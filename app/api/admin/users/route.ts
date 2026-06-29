import { NextResponse } from "next/server";
import { generateTemporaryPassword, hashPassword, normalizeEmail, requireAdmin } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

function userSelect() {
  return {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    plan: true,
    paymentId: true,
    forcePasswordChange: true,
    lastLoginAt: true,
    createdAt: true,
    _count: { select: { businesses: true } }
  };
}

export async function GET() {
  await ensureDatabaseSchema();
  const { response } = await requireAdmin();
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userSelect()
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  await ensureDatabaseSchema();
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const email = normalizeEmail(String(body.email ?? ""));
  const name = String(body.name ?? email).trim() || email;
  const phone = String(body.phone ?? "").trim() || null;
  const plan = String(body.plan ?? "").trim() || null;
  const password = generateTemporaryPassword();

  if (!email) {
    return NextResponse.json({ error: "Informe o email do usuário." }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      phone,
      plan,
      status: "ACTIVE",
      passwordHash: hashPassword(password),
      forcePasswordChange: true
    },
    create: {
      name,
      email,
      phone,
      plan,
      role: "USER",
      status: "ACTIVE",
      passwordHash: hashPassword(password),
      forcePasswordChange: true
    },
    select: userSelect()
  });

  return NextResponse.json({
    user,
    temporaryPassword: password,
    loginUrl: process.env.APP_URL || request.headers.get("origin") || ""
  });
}
