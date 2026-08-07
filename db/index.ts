import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL não definida. Conecte o Neon via Vercel e configure o .env.",
  );
}

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
