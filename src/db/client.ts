import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL chưa được cấu hình.");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  return drizzle({ client: pool, schema });
}
