import { NextResponse } from "next/server";
import { aiSpeechModel } from "@/lib/ai-costs";
import { requireAdmin } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/lib/db-setup";
import { prisma } from "@/lib/prisma";

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET() {
  await ensureDatabaseSchema();
  const { response } = await requireAdmin();
  if (response) return response;

  const since = startOfMonth();
  const [total, month, byUser] = await Promise.all([
    prisma.aiUsage.aggregate({
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      _count: true
    }),
    prisma.aiUsage.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      _count: true
    }),
    prisma.aiUsage.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 8
    })
  ]);

  const users = await prisma.user.findMany({
    where: { id: { in: byUser.map((item) => item.userId) } },
    select: { id: true, name: true, email: true }
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return NextResponse.json({
    model: aiSpeechModel,
    total: {
      requests: total._count,
      inputTokens: total._sum.inputTokens ?? 0,
      outputTokens: total._sum.outputTokens ?? 0,
      estimatedCostUsd: total._sum.estimatedCostUsd ?? 0
    },
    month: {
      requests: month._count,
      inputTokens: month._sum.inputTokens ?? 0,
      outputTokens: month._sum.outputTokens ?? 0,
      estimatedCostUsd: month._sum.estimatedCostUsd ?? 0
    },
    byUser: byUser.map((item) => {
      const owner = usersById.get(item.userId);
      return {
        userId: item.userId,
        name: owner?.name ?? "Usuário",
        email: owner?.email ?? "",
        requests: item._count._all,
        inputTokens: item._sum.inputTokens ?? 0,
        outputTokens: item._sum.outputTokens ?? 0,
        estimatedCostUsd: item._sum.estimatedCostUsd ?? 0
      };
    })
  });
}
