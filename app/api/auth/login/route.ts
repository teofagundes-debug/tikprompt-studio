import { NextResponse } from "next/server";
import { isSubscriptionActive } from "@/lib/billing";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { hashPassword, normalizeEmail, publicUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
    }

    const userCount = await prisma.user.count();

    if (userCount === 0) {
      const name = String(body.name ?? "Admin").trim() || "Admin";
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: "ADMIN",
          status: "ACTIVE",
          passwordHash: hashPassword(password),
          forcePasswordChange: false
        }
      });

      await prisma.business.updateMany({
        where: { userId: null },
        data: { userId: user.id }
      });
      await setSessionCookie(user.id);
      return NextResponse.json({ user: publicUser(user), createdAdmin: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE" || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
    }

    if (user.role !== "ADMIN" && !isSubscriptionActive(user.expiresAt)) {
      return NextResponse.json({ error: "Sua assinatura venceu. Entre em contato para renovar o acesso." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await setSessionCookie(user.id);

    return NextResponse.json({
      user: publicUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        forcePasswordChange: user.forcePasswordChange,
        plan: user.plan,
        activatedAt: user.activatedAt,
        expiresAt: user.expiresAt,
        lastPaymentAt: user.lastPaymentAt
      })
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json(
      {
        error: "Não foi possível entrar.",
        details
      },
      { status: 500 }
    );
  }
}
