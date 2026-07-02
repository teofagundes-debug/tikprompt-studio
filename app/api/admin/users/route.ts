import { NextResponse } from "next/server";
import { nextExpiration, normalizePlan } from "@/lib/billing";
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
    activatedAt: true,
    expiresAt: true,
    lastPaymentAt: true,
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
  const plan = normalizePlan(String(body.plan ?? "").trim() || null);
  const password = generateTemporaryPassword();
  const now = new Date();

  if (!email) {
    return NextResponse.json({ error: "Informe o email do usuário." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { activatedAt: true, expiresAt: true }
  });
  const expiresAt = nextExpiration(existingUser?.expiresAt, plan);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      phone,
      plan,
      activatedAt: existingUser?.activatedAt ?? now,
      expiresAt,
      lastPaymentAt: now,
      status: "ACTIVE",
      passwordHash: hashPassword(password),
      forcePasswordChange: true
    },
    create: {
      name,
      email,
      phone,
      plan,
      activatedAt: now,
      expiresAt,
      lastPaymentAt: now,
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
