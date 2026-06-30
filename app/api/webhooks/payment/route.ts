import { NextResponse } from "next/server";
import { generateTemporaryPassword, hashPassword, normalizeEmail } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  await ensureDatabaseSchema();

  const secret = process.env.WEBHOOK_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-webhook-secret") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : authorization.trim();

  if (!secret || (token !== secret && headerSecret !== secret)) {
    return NextResponse.json(
      {
        error: "Webhook não autorizado.",
        hint: "Envie Authorization: Bearer WEBHOOK_SECRET ou X-Webhook-Secret com o mesmo valor configurado no Render."
      },
      { status: 401 }
    );
  }

  const body = await request.json();
  const status = String(body.status ?? body.paymentStatus ?? "").toLowerCase();

  if (!["paid", "approved", "confirmed", "pago"].includes(status)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Pagamento ainda não confirmado." });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  if (!email) {
    return NextResponse.json({ error: "Informe o email do cliente." }, { status: 400 });
  }

  const name = String(body.name ?? body.nome ?? email).trim() || email;
  const phone = String(body.phone ?? body.telefone ?? "").trim() || null;
  const plan = String(body.plan ?? body.plano ?? "").trim() || null;
  const paymentId = String(body.paymentId ?? body.pixId ?? body.id ?? "").trim() || null;
  const temporaryPassword = generateTemporaryPassword();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      phone,
      plan,
      paymentId,
      status: "ACTIVE",
      passwordHash: hashPassword(temporaryPassword),
      forcePasswordChange: true
    },
    create: {
      name,
      email,
      phone,
      plan,
      paymentId,
      role: "USER",
      status: "ACTIVE",
      passwordHash: hashPassword(temporaryPassword),
      forcePasswordChange: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      plan: true,
      status: true,
      forcePasswordChange: true
    }
  });

  return NextResponse.json({
    ok: true,
    user,
    email: user.email,
    temporaryPassword,
    loginUrl: process.env.APP_URL || request.headers.get("origin") || ""
  });
}
