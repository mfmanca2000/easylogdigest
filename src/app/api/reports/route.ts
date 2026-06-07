import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;
  const appId = searchParams.get("appId") ?? undefined;
  const envId = searchParams.get("envId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const date = searchParams.get("date") ?? undefined;

  const where = {
    appEnvConfig: {
      ...(appId ? { applicationId: appId } : {}),
      ...(envId ? { environmentId: envId } : {}),
    },
    ...(status ? { status: status as never } : {}),
    ...(date ? { reportDate: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) } } : {}),
  };

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      include: {
        appEnvConfig: {
          include: { application: true, environment: true },
        },
      },
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ reports, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
