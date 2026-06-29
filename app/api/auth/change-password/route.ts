import { NextResponse } from "next/server";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response || !user) return response;

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!dbUser.forcePasswordChange && !verifyPassword(currentPassword, dbUser.passwordHash)) {
    return NextResponse.json({ error: "Senha atual inválida." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      forcePasswordChange: false
    }
  });

  return NextResponse.json({ ok: true });
}
