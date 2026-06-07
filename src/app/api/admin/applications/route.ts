import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
});

export async function GET() {
  const apps = await prisma.application.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(apps);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const app = await prisma.application.create({ data: parsed.data });
    return NextResponse.json(app, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Name already exists" }, { status: 409 });
  }
}
