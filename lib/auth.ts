import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  forcePasswordChange: boolean;
};

const cookieName = "tikprompt_session";

function authSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-tikprompt-secret-change-me";
}

function sign(value: string) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateTemporaryPassword() {
  return crypto.randomBytes(6).toString("base64url").slice(0, 10);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [method, iterationsText, salt, expectedHash] = passwordHash.split("$");
  if (method !== "pbkdf2_sha256" || !iterationsText || !salt || !expectedHash) return false;

  const hash = crypto.pbkdf2Sync(password, salt, Number(iterationsText), 32, "sha256").toString("base64url");
  return safeEqual(hash, expectedHash);
}

function encodeSession(userId: string) {
  const payload = JSON.stringify({ userId, createdAt: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSession(value?: string) {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = decodeSession(cookieStore.get(cookieName)?.value);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      forcePasswordChange: true
    }
  });

  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  }

  return { user, response: null };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.response) return result;
  if (result.user?.role !== "ADMIN") {
    return { user: result.user, response: NextResponse.json({ error: "Acesso restrito ao admin." }, { status: 403 }) };
  }

  return result;
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    forcePasswordChange: user.forcePasswordChange
  };
}
