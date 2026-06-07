import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Server, Globe, Database, Users, Activity } from "lucide-react";

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
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of EasyLogDigest configuration and activity</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" /> {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">No reports generated yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((r: typeof recentReports[0]) => (
                <li key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="font-medium">
                    {r.appEnvConfig.application.displayName} / {r.appEnvConfig.environment.name}
                  </span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{r.uniqueErrors} unique errors</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : r.status === "FAILED"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {r.status}
                    </span>
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
