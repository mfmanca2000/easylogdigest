import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateReportPdf } from "@/lib/pdf/generate-pdf";
import { format } from "date-fns";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

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

  if (!report) return new Response("Not found", { status: 404 });

  const pdfData = {
    id: report.id,
    reportDate: report.reportDate,
    generatedAt: report.generatedAt,
    appName: report.appEnvConfig.application.displayName,
    envName: report.appEnvConfig.environment.name,
    errorCount: report.errorCount,
    uniqueErrors: report.uniqueErrors,
    newErrors: report.newErrors,
    entries: report.reportEntries.map((e) => ({
      fingerprint: e.errorEntry.fingerprint,
      normalizedMsg: e.errorEntry.normalizedMsg,
      countInWindow: e.countInWindow,
      isNew: e.isNew,
      firstSeenAt: e.errorEntry.firstSeenAt,
      aiHint: e.aiHint ?? null,
    })),
  };

  const buffer = await generateReportPdf(pdfData);
  const dateStr = format(report.reportDate, "yyyy-MM-dd");
  const filename = `report-${report.appEnvConfig.application.name}-${report.appEnvConfig.environment.name}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
