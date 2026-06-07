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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/reports"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {report.appEnvConfig.application.displayName}
              <span className="mx-2 text-muted-foreground">/</span>
              {report.appEnvConfig.environment.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(report.reportDate, "MMMM d, yyyy")} · Generated {format(report.generatedAt, "HH:mm")} UTC
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href={`/reports/${id}/pdf`} target="_blank">
            <Download className="h-4 w-4" />
            Export PDF
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Total errors</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{report.errorCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Unique types</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{report.uniqueErrors}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> New errors</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${report.newErrors > 0 ? "text-destructive" : ""}`}>{report.newErrors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" /> Recurring</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{recurring}</p></CardContent>
        </Card>
      </div>

      {/* Error table */}
      <Card>
        <CardHeader>
          <CardTitle>Error Details</CardTitle>
        </CardHeader>
        <CardContent>
          {report.reportEntries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No errors found in this window.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">First seen</TableHead>
                  <TableHead>Error message</TableHead>
                  <TableHead className="w-64">Investigation hint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.reportEntries.map((entry: typeof report.reportEntries[0]) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-right font-bold tabular-nums">{entry.countInWindow}</TableCell>
                    <TableCell>
                      {entry.isNew ? (
                        <Badge variant="destructive">NEW</Badge>
                      ) : (
                        <Badge variant="secondary">recurring</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(entry.errorEntry.firstSeenAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs break-all line-clamp-3" title={entry.errorEntry.normalizedMsg}>
                        {entry.errorEntry.normalizedMsg}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground italic">
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
