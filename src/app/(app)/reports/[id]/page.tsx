import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, AlertTriangle, Activity, Zap, RotateCcw } from "lucide-react";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await auth();
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

  if (!report) notFound();

  const recurring = report.uniqueErrors - report.newErrors;

  const stats = [
    { label: "Total errors", value: report.errorCount, icon: Activity, color: "text-foreground" },
    { label: "Unique types", value: report.uniqueErrors, icon: AlertTriangle, color: "text-foreground" },
    { label: "New errors", value: report.newErrors, icon: Zap, color: report.newErrors > 0 ? "text-destructive" : "text-foreground" },
    { label: "Recurring", value: recurring, icon: RotateCcw, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
            <Link href="/reports"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {report.appEnvConfig.application.displayName}
              </h1>
              <span className="text-muted-foreground">/</span>
              <Badge variant="outline" className="text-sm font-medium">
                {report.appEnvConfig.environment.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(report.reportDate, "MMMM d, yyyy")} &middot; Generated at {format(report.generatedAt, "HH:mm")} UTC
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
          <Link href={`/reports/${id}/pdf`} target="_blank">
            <Download className="size-4" />
            Export PDF
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="ring-1 ring-foreground/10 shadow-sm">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="size-3.5" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error table */}
      <Card className="ring-1 ring-foreground/10 shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Error Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.reportEntries.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No errors found in this window.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-16 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground pl-6">Count</TableHead>
                  <TableHead className="w-24 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="w-28 text-xs font-semibold uppercase tracking-wide text-muted-foreground">First seen</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error message</TableHead>
                  <TableHead className="w-64 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI hint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.reportEntries.map((entry: typeof report.reportEntries[0]) => (
                  <TableRow
                    key={entry.id}
                    className="border-b border-border/60 hover:bg-surface-50 transition-colors duration-100"
                  >
                    <TableCell className="pl-6 text-right font-bold tabular-nums text-sm">
                      {entry.countInWindow}
                    </TableCell>
                    <TableCell>
                      {entry.isNew ? (
                        <Badge variant="destructive" className="text-xs">NEW</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">recurring</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(entry.errorEntry.firstSeenAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <p
                        className="font-mono text-xs break-all line-clamp-3 text-foreground"
                        title={entry.errorEntry.normalizedMsg}
                      >
                        {entry.errorEntry.normalizedMsg}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        {entry.aiHint ?? "—"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
