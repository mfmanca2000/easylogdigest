import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Server, Globe, Database, Users, Activity } from "lucide-react";
import { format } from "date-fns";

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-emerald-500",
  RUNNING: "bg-blue-500 animate-pulse",
  FAILED: "bg-red-500",
  PENDING: "bg-slate-400",
};

export default async function AdminDashboard() {
  const [reportCount, appCount, envCount, dsCount, userCount, recentReports] = await Promise.all([
    prisma.dailyReport.count(),
    prisma.application.count(),
    prisma.environment.count(),
    prisma.grafanaDatasource.count(),
    prisma.user.count(),
    prisma.dailyReport.findMany({
      take: 5,
      orderBy: { generatedAt: "desc" },
      include: { appEnvConfig: { include: { application: true, environment: true } } },
    }),
  ]);

  const stats = [
    { label: "Total Reports", value: reportCount, icon: FileText },
    { label: "Applications", value: appCount, icon: Server },
    { label: "Environments", value: envCount, icon: Globe },
    { label: "Datasources", value: dsCount, icon: Database },
    { label: "Users", value: userCount, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of EasyLogDigest configuration and activity
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="ring-1 ring-foreground/10 shadow-sm">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="size-3.5" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent jobs */}
      <Card className="ring-1 ring-foreground/10 shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="size-4 text-muted-foreground" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentReports.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No reports generated yet.</p>
          ) : (
            <ul>
              {recentReports.map((r: typeof recentReports[0], i: number) => (
                <li
                  key={r.id}
                  className={`flex items-center justify-between px-6 py-3 text-sm ${i < recentReports.length - 1 ? "border-b border-border/60" : ""} hover:bg-surface-50 transition-colors duration-100`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-2 rounded-full shrink-0 ${STATUS_DOT[r.status] ?? "bg-slate-400"}`} />
                    <span className="font-medium text-foreground truncate">
                      {r.appEnvConfig.application.displayName}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {r.appEnvConfig.environment.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-4">
                    <span>{r.uniqueErrors} unique errors</span>
                    <span>{format(r.generatedAt, "MMM d, HH:mm")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
