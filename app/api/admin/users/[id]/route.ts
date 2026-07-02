import { NextResponse } from "next/server";
import { normalizePlan } from "@/lib/billing";
import { generateTemporaryPassword, hashPassword, normalizeEmail, requireAdmin } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Params) {
  await ensureDatabaseSchema();
  const { user: admin, response } = await requireAdmin();
  if (response || !admin) return response;

  const { id } = await params;
  const body = await request.json();
  const action = String(body.action ?? "");

  if (id === admin.id && body.status === "BLOCKED") {
    return NextResponse.json({ error: "Você não pode bloquear o próprio usuário admin." }, { status: 400 });
  }

  if (action === "reset-password") {
    const temporaryPassword = generateTemporaryPassword();
    const user = await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashPassword(temporaryPassword),
        forcePasswordChange: true,
        status: "ACTIVE"
      },
      select: userSelect()
    });

    return NextResponse.json({
      user,
      temporaryPassword,
      loginUrl: process.env.APP_URL || request.headers.get("origin") || ""
    });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name) } : {}),
      ...(body.email ? { email: normalizeEmail(String(body.email)) } : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone || "") || null } : {}),
      ...(body.plan !== undefined ? { plan: normalizePlan(String(body.plan || "") || null) } : {}),
      ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null } : {}),
      ...(body.activatedAt !== undefined ? { activatedAt: body.activatedAt ? new Date(String(body.activatedAt)) : null } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
      ...(body.role ? { role: String(body.role) } : {})
    },
    select: userSelect()
  });

  return NextResponse.json({ user });
}

export async function DELETE(_request: Request, { params }: Params) {
  await ensureDatabaseSchema();
  const { user: admin, response } = await requireAdmin();
  if (response || !admin) return response;

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: "Você não pode excluir o próprio usuário admin." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
