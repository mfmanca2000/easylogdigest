import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, RefreshCw } from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  COMPLETED: "success",
  RUNNING: "default",
  FAILED: "destructive",
  PENDING: "secondary",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await auth();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const pageSize = 20;

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count(),
    prisma.dailyReport.findMany({
      include: {
        appEnvConfig: { include: { application: true, environment: true } },
      },
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Reports</h1>
          <p className="text-muted-foreground">View nightly error digests for all applications</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm mt-1">Reports are generated nightly. An admin can trigger one manually.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Errors</TableHead>
                  <TableHead className="text-right">Unique</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r: typeof reports[0]) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{format(r.reportDate, "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.appEnvConfig.application.displayName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.appEnvConfig.environment.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.errorCount}</TableCell>
                    <TableCell className="text-right">{r.uniqueErrors}</TableCell>
                    <TableCell className="text-right">
                      {r.newErrors > 0 ? (
                        <span className="font-semibold text-destructive">{r.newErrors}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/app/reports/${r.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/reports?page=${page - 1}`}>Previous</Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/reports?page=${page + 1}`}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
