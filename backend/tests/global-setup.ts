import { execSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from './test-database.js';

/** Aplica as migrações no banco de teste antes da suíte. */
export default function globalSetup(): void {
  const databaseUrl = resolveTestDatabaseUrl();
  try {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: databaseUrl } });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(`Falha ao aplicar migrações no banco de teste (${new URL(databaseUrl).host}).\n${stderr}`);
  }
}
