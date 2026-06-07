import { prisma } from "@/lib/prisma";
import { processAppEnv } from "./process-app-env";

export async function runDigest(): Promise<void> {
  const configs = await prisma.appEnvConfig.findMany({
    where: { enabled: true },
    include: { application: true, environment: true, datasource: true },
  });

  const reportDate = new Date();
  reportDate.setHours(0, 0, 0, 0);

  const results = await Promise.allSettled(
    configs.map(async (config: typeof configs[0]) => {
      // create or reset report for today
      const report = await prisma.dailyReport.upsert({
        where: { appEnvConfigId_reportDate: { appEnvConfigId: config.id, reportDate } },
        create: { appEnvConfigId: config.id, reportDate, status: "RUNNING" },
        update: { status: "RUNNING", errorMessage: null, generatedAt: new Date() },
      });

      // clear existing entries if re-running
      await prisma.reportEntry.deleteMany({ where: { reportId: report.id } });

      try {
        const stats = await processAppEnv(config, report.id);
        await prisma.dailyReport.update({
          where: { id: report.id },
          data: { status: "COMPLETED", ...stats },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.dailyReport.update({
          where: { id: report.id },
          data: { status: "FAILED", errorMessage: message },
        });
        throw err;
      }
    })
  );

  const failures = results.filter((r: PromiseSettledResult<void>) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(`[EasyLogDigest] ${failures.length}/${configs.length} digest jobs failed`);
  }
}
