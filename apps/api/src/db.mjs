import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__mivaPrisma ||
  new PrismaClient({
    log: process.env.PRISMA_QUERY_LOG === "true" ? ["query", "warn", "error"] : ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__mivaPrisma = prisma;
}

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
  return {
    ok: true,
    provider: "postgresql"
  };
}
