import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { stopScheduler, startScheduler } from "@/lib/cron/scheduler";

const emailSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1),
  password: z.string().min(1),
  fromAddress: z.string().email(),
  recipients: z.string().min(1),
});

const scheduleSchema = z.object({
  cronExpr: z.string().min(1),
  enabled: z.boolean(),
});

const settingsSchema = z.object({
  email: emailSchema.optional(),
  schedule: scheduleSchema.optional(),
});

export async function GET() {
  const [email, schedule] = await Promise.all([
    prisma.emailConfig.findFirst(),
    prisma.scheduleConfig.findFirst(),
  ]);
  return NextResponse.json({ email, schedule });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const results: Record<string, unknown> = {};

  if (parsed.data.email) {
    const existing = await prisma.emailConfig.findFirst();
    if (existing) {
      results.email = await prisma.emailConfig.update({ where: { id: existing.id }, data: parsed.data.email });
    } else {
      results.email = await prisma.emailConfig.create({ data: parsed.data.email });
    }
  }

  if (parsed.data.schedule) {
    const existing = await prisma.scheduleConfig.findFirst();
    if (existing) {
      results.schedule = await prisma.scheduleConfig.update({ where: { id: existing.id }, data: parsed.data.schedule });
    } else {
      results.schedule = await prisma.scheduleConfig.create({ data: parsed.data.schedule });
    }
    // Re-arm the scheduler with the new expression
    stopScheduler();
    await startScheduler();
  }

  return NextResponse.json(results);
}
