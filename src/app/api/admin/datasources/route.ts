import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["LOKI", "ELASTICSEARCH"]),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  lokiOrgId: z.string().optional().nullable(),
  esIndex: z.string().optional().nullable(),
  esUsername: z.string().optional().nullable(),
  esPassword: z.string().optional().nullable(),
});

export async function GET() {
  const ds = await prisma.grafanaDatasource.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(ds);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ds = await prisma.grafanaDatasource.create({ data: parsed.data });
    return NextResponse.json(ds, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Name already exists" }, { status: 409 });
  }
}
