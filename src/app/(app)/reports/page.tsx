import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, RefreshCw, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TriggerDigestButton } from "@/components/reports/trigger-digest-button";

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-emerald-500",
  RUNNING: "bg-blue-500 animate-pulse",
  FAILED: "bg-red-500",
  PENDING: "bg-slate-400",
};

type SortKey = "date" | "application" | "environment" | "status" | "total" | "unique" | "new";
type SortOrder = "asc" | "desc";

const SORT_ORDER_BY: Record<SortKey, (order: SortOrder) => object> = {
  date: (o) => ({ reportDate: o }),
  application: (o) => ({ appEnvConfig: { application: { displayName: o } } }),
  environment: (o) => ({ appEnvConfig: { environment: { name: o } } }),
  status: (o) => ({ status: o }),
  total: (o) => ({ errorCount: o }),
  unique: (o) => ({ uniqueErrors: o }),
  new: (o) => ({ newErrors: o }),
};

function sortUrl(col: SortKey, currentSort: SortKey, currentOrder: SortOrder, page: number) {
  const nextOrder = currentSort === col && currentOrder === "asc" ? "desc" : "asc";
  return `/reports?sort=${col}&order=${nextOrder}&page=${page}`;
}

function SortIcon({ col, currentSort, currentOrder }: { col: SortKey; currentSort: SortKey; currentOrder: SortOrder }) {
  if (currentSort !== col) return <ChevronsUpDown className="size-3 opacity-40" />;
  return currentOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; order?: string }>;
}) {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const { page: pageStr, sort: sortParam, order: orderParam } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const pageSize = 20;

  const sort: SortKey = (sortParam as SortKey) in SORT_ORDER_BY ? (sortParam as SortKey) : "date";
  const order: SortOrder = orderParam === "asc" ? "asc" : "desc";

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count(),
    prisma.dailyReport.findMany({
      include: {
        appEnvConfig: { include: { application: true, environment: true } },
      },
      orderBy: SORT_ORDER_BY[sort](order),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Daily Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nightly error digests for all applications
          </p>
        </div>
        {isAdmin && <TriggerDigestButton />}
      </div>

      {/* Table card */}
      <Card className="ring-1 ring-foreground/10 shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="size-4 text-muted-foreground" />
            Reports
            <span className="ml-1 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {total}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <RefreshCw className="size-8 mb-3 opacity-30" />
              <p className="font-medium text-sm">No reports yet</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Reports are generated nightly. An admin can trigger one manually.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  {(["date", "application", "environment", "status"] as SortKey[]).map((col, i) => (
                    <TableHead key={col} className={i === 0 ? "pl-6" : ""}>
                      <Link
                        href={sortUrl(col, sort, order, page)}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors w-fit"
                      >
                        {col.charAt(0).toUpperCase() + col.slice(1)}
                        <SortIcon col={col} currentSort={sort} currentOrder={order} />
                      </Link>
                    </TableHead>
                  ))}
                  {(["total", "unique", "new"] as SortKey[]).map((col) => (
                    <TableHead key={col} className="text-right">
                      <Link
                        href={sortUrl(col, sort, order, page)}
                        className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors ml-auto w-fit"
                      >
                        {col.charAt(0).toUpperCase() + col.slice(1)}
                        <SortIcon col={col} currentSort={sort} currentOrder={order} />
                      </Link>
                    </TableHead>
                  ))}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r: typeof reports[0]) => (
                  <TableRow
                    key={r.id}
                    className="group border-b border-border/60 hover:bg-surface-50 transition-colors duration-100"
                  >
                    <TableCell className="pl-6 font-medium text-sm">
                      {format(r.reportDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {r.appEnvConfig.application.displayName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {r.appEnvConfig.environment.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full shrink-0 ${STATUS_DOT[r.status] ?? "bg-slate-400"}`}
                        />
                        <span className="text-xs font-medium capitalize lowercase">
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.errorCount}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.uniqueErrors}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.newErrors > 0 ? (
                        <span className="text-sm font-semibold text-destructive">{r.newErrors}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <Button asChild variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/reports/${r.id}`}>
                          <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/reports?sort=${sort}&order=${order}&page=${page - 1}`}>Previous</Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/reports?sort=${sort}&order=${order}&page=${page + 1}`}>Next</Link>
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
