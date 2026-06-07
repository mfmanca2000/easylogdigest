import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  applicationId: z.string().cuid(),
  environmentId: z.string().cuid(),
  datasourceId: z.string().cuid(),
  queryTemplate: z.string().min(1),
  lookbackHours: z.number().int().min(1).max(720).default(24),
  enabled: z.boolean().default(true),
});

export async function GET() {
  const configs = await prisma.appEnvConfig.findMany({
    include: { application: true, environment: true, datasource: true },
    orderBy: [{ application: { name: "asc" } }, { environment: { name: "asc" } }],
  });
  return NextResponse.json(configs);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const config = await prisma.appEnvConfig.create({
      data: parsed.data,
      include: { application: true, environment: true, datasource: true },
    });
    return NextResponse.json(config, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Configuration already exists for this app/env pair" }, { status: 409 });
  }
}
