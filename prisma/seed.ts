import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin", passwordHash, role: "ADMIN" },
  });
  console.log("Admin user:", admin.email);

  // AM user
  const amHash = await bcrypt.hash("am1234567", 12);
  const am = await prisma.user.upsert({
    where: { email: "am@example.com" },
    update: {},
    create: { email: "am@example.com", name: "AM User", passwordHash: amHash, role: "AM" },
  });
  console.log("AM user:", am.email);

  // Schedule config
  await prisma.scheduleConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", cronExpr: "0 6 * * *", enabled: true },
  });

  // Grafana datasource (points to local Docker Loki)
  const ds = await prisma.grafanaDatasource.upsert({
    where: { name: "local-loki" },
    update: {},
    create: {
      name: "local-loki",
      type: "LOKI",
      baseUrl: "http://localhost:3100",
      apiKey: "no-auth",
      lokiOrgId: null,
    },
  });
  console.log("Datasource:", ds.name);

  // Applications
  const appNames = [
    { name: "payments-service", displayName: "Payments Service" },
    { name: "auth-service", displayName: "Auth Service" },
    { name: "api-gateway", displayName: "API Gateway" },
    { name: "notification-service", displayName: "Notification Service" },
  ];

  for (const a of appNames) {
    await prisma.application.upsert({ where: { name: a.name }, update: {}, create: a });
  }

  // Environments
  for (const name of ["production", "staging"]) {
    await prisma.environment.upsert({ where: { name }, update: {}, create: { name } });
  }

  // App × Env configs
  const apps = await prisma.application.findMany();
  const envs = await prisma.environment.findMany();

  for (const app of apps) {
    for (const env of envs) {
      await prisma.appEnvConfig.upsert({
        where: { applicationId_environmentId: { applicationId: app.id, environmentId: env.id } },
        update: {},
        create: {
          applicationId: app.id,
          environmentId: env.id,
          datasourceId: ds.id,
          queryTemplate: `{app="${app.name}",env="${env.name}"} |= "error"`,
          lookbackHours: 24,
          enabled: true,
        },
      });
    }
  }

  console.log(`Created ${apps.length * envs.length} app/env configs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
