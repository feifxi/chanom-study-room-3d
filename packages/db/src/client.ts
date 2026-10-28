import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string): { db: Db; close: () => Promise<void> } {
  const sql = postgres(url, { max: 5 });
  return { db: drizzle(sql, { schema }), close: () => sql.end() };
}

/** Apply pending migrations from packages/db/drizzle (or a given folder in a bundled build). */
export async function migrateDb(db: Db, migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))) {
  await migrate(db, { migrationsFolder });
}
