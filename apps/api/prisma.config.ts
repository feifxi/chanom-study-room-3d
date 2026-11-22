// Prisma CLI settings (migrations, studio, generate). Prisma doesn't read .env on its own.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed/index.ts' },
  // Read directly, not with env(), so `prisma generate` also works without a database (CI, fresh clones)
  datasource: { url: process.env.DATABASE_URL },
});
