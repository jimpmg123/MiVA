import "dotenv/config";
import { checkDatabaseConnection, prisma } from "../src/db.mjs";

const timeout = setTimeout(() => {
  console.error("Database check timed out after 15 seconds.");
  process.exit(1);
}, 15000);

try {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set. Add the Supabase PostgreSQL URL before running db:check.");
    process.exit(0);
  }

  const result = await checkDatabaseConnection();
  clearTimeout(timeout);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  clearTimeout(timeout);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
