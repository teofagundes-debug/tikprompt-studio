import { NextResponse } from "next/server";
import { generateTemporaryPassword, hashPassword, requireAdmin } from "@/lib/auth";
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
    forcePasswordChange: true,
    lastLoginAt: true,
    createdAt: true,
    _count: { select: { businesses: true } }
  };
}

export async function PATCH(request: Request, { params }: Params) {
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
      ...(body.phone !== undefined ? { phone: String(body.phone || "") || null } : {}),
      ...(body.plan !== undefined ? { plan: String(body.plan || "") || null } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
      ...(body.role ? { role: String(body.role) } : {})
    },
    select: userSelect()
  });

  return NextResponse.json({ user });
}
