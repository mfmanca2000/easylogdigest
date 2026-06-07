import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      appEnvConfig: { include: { application: true, environment: true } },
      reportEntries: {
        include: { errorEntry: true },
        orderBy: { countInWindow: "desc" },
      },
    },
  });

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(report);
}
