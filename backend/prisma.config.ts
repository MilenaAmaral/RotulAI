import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // `prisma generate` não precisa de conexão; migrate/seed exigem DATABASE_URL definida no .env.
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
