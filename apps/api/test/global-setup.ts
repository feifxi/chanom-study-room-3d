import { execFileSync } from 'node:child_process';
import pg from 'pg';

/**
 * Tests that need a database get their own, `connecta_test`, in the Postgres from compose.yaml
 * (CI runs the same image as a service). Created if missing and migrated once per run; each test
 * file cleans the tables it uses.
 */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://connecta:connecta@localhost:5433/connecta_test');
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const db = url.pathname.slice(1);
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${db}"`);
  await client.end();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'ignore',
  });
}
