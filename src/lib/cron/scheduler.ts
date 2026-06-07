// eslint-disable-next-line @typescript-eslint/no-require-imports
const cron = require("node-cron") as typeof import("node-cron");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scheduledTask: any = null;

export async function startScheduler(): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const config = await prisma.scheduleConfig.findFirst();
  const expr = config?.cronExpr ?? "0 6 * * *";
  const enabled = config?.enabled ?? true;

  if (!enabled) {
    console.log("[EasyLogDigest] Scheduler disabled by config.");
    return;
  }

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!cron.validate(expr)) {
    console.error(`[EasyLogDigest] Invalid cron expression: ${expr}`);
    return;
  }

  scheduledTask = cron.schedule(
    expr,
    async () => {
      console.log("[EasyLogDigest] Starting nightly digest...");
      try {
        const { runDigest } = await import("@/lib/digest/run-digest");
        await runDigest();
        console.log("[EasyLogDigest] Nightly digest completed.");
      } catch (err) {
        console.error("[EasyLogDigest] Digest failed:", err);
      }
    },
    { timezone: "UTC" }
  );

  console.log(`[EasyLogDigest] Scheduler started with cron: "${expr}"`);
}

export function stopScheduler(): void {
  scheduledTask?.stop();
  scheduledTask = null;
}
