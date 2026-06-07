import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(["LOKI", "ELASTICSEARCH"]).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  lokiOrgId: z.string().optional().nullable(),
  esIndex: z.string().optional().nullable(),
  esUsername: z.string().optional().nullable(),
  esPassword: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = await prisma.grafanaDatasource.findUnique({ where: { id } });
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ds);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ds = await prisma.grafanaDatasource.update({ where: { id }, data: parsed.data });
    return NextResponse.json(ds);
  } catch {
    return NextResponse.json({ error: "Not found or name conflict" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.grafanaDatasource.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
