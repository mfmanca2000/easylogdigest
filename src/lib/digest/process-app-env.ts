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

  for (const [fingerprint, group] of groups) {
    // upsert ErrorEntry — detect new vs recurring
    const existing = await prisma.errorEntry.findUnique({
      where: { appEnvConfigId_fingerprint: { appEnvConfigId: config.id, fingerprint } },
    });

    let errorEntryId: string;
    const isNew = !existing;

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
      newErrors++;
    } else {
      await prisma.errorEntry.update({
        where: { id: existing.id },
        data: { lastSeenAt: group.maxTs, exampleRawMsg: group.example.slice(0, 2000) },
      });
      errorEntryId = existing.id;
    }

    // get AI hint
    const aiHint = await getAiHint(group.normalized);

    await prisma.reportEntry.create({
      data: {
        reportId,
        errorEntryId,
        countInWindow: group.count,
        isNew,
        aiHint,
      },
    });
  }

  return {
    errorCount: logLines.length,
    uniqueErrors: groups.size,
    newErrors,
  };
}
