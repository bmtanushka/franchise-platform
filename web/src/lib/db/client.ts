import postgres from "postgres";

declare global {
  var _sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global._sql ??
  postgres(process.env.DATABASE_URL!, {
    ssl: process.env.DATABASE_URL?.includes("127.0.0.1") ? false : "require",
  });

if (process.env.NODE_ENV !== "production") {
  global._sql = sql;
}
