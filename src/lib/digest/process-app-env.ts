import { prisma } from "@/lib/prisma";
import { fingerprintMessage } from "@/lib/fingerprint";
import { createGrafanaClient } from "@/lib/grafana-factory";
import { getAiHint } from "./ai-hints";
import type { AppEnvConfig, GrafanaDatasource, Application, Environment } from "@/generated/prisma/client";

type FullConfig = AppEnvConfig & {
  application: Application;
  environment: Environment;
  datasource: GrafanaDatasource;
};

export async function processAppEnv(config: FullConfig, reportId: string): Promise<{
  errorCount: number;
  uniqueErrors: number;
  newErrors: number;
}> {
  const to = new Date();
  const from = new Date(to.getTime() - config.lookbackHours * 60 * 60 * 1000);

  const client = createGrafanaClient(config.datasource);
  const logLines = await client.queryLogs({
    queryTemplate: config.queryTemplate,
    appName: config.application.name,
    envName: config.environment.name,
    from,
    to,
  });

  // Group by fingerprint
  const groups = new Map<string, {
    normalized: string;
    example: string;
    count: number;
    minTs: Date;
    maxTs: Date;
  }>();

  for (const line of logLines) {
    const { normalized, fingerprint } = fingerprintMessage(line.message);
    const existing = groups.get(fingerprint);
    if (existing) {
      existing.count++;
      if (line.timestamp < existing.minTs) existing.minTs = line.timestamp;
      if (line.timestamp > existing.maxTs) existing.maxTs = line.timestamp;
    } else {
      groups.set(fingerprint, {
        normalized,
        example: line.message,
        count: 1,
        minTs: line.timestamp,
        maxTs: line.timestamp,
      });
    }
  }

  let newErrors = 0;

  const entries = await Promise.all(
    [...groups.entries()].map(async ([fingerprint, group]) => {
      const existing = await prisma.errorEntry.findUnique({
        where: { appEnvConfigId_fingerprint: { appEnvConfigId: config.id, fingerprint } },
      });

      const isNew = !existing;
      let errorEntryId: string;

      if (!existing) {
        const created = await prisma.errorEntry.create({
          data: {
            appEnvConfigId: config.id,
            fingerprint,
            normalizedMsg: group.normalized,
            exampleRawMsg: group.example.slice(0, 2000),
            firstSeenAt: group.minTs,
            lastSeenAt: group.maxTs,
          },
        });
        errorEntryId = created.id;
      } else {
        await prisma.errorEntry.update({
          where: { id: existing.id },
          data: { lastSeenAt: group.maxTs, exampleRawMsg: group.example.slice(0, 2000) },
        });
        errorEntryId = existing.id;
      }

      const aiHint = await getAiHint(group.normalized);

      return { errorEntryId, countInWindow: group.count, isNew, aiHint };
    })
  );

  newErrors = entries.filter((e) => e.isNew).length;

  await prisma.reportEntry.createMany({
    data: entries.map((e) => ({
      reportId,
      errorEntryId: e.errorEntryId,
      countInWindow: e.countInWindow,
      isNew: e.isNew,
      aiHint: e.aiHint,
    })),
  });

  return {
    errorCount: logLines.length,
    uniqueErrors: groups.size,
    newErrors,
  };
}
