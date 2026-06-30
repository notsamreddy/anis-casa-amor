import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let database: NeonHttpDatabase<typeof schema> | undefined;

export function getDb() {
  if (!database) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    const sql = neon(process.env.DATABASE_URL);
    database = drizzle(sql, { schema });
  }

  return database;
}
