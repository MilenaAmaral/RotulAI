import { execSync } from 'node:child_process';

/** Aplica as migrações no banco de teste antes da suíte. */
export default function globalSetup(): void {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://skinai:skinai@localhost:5432/skinai_test';
  try {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: databaseUrl } });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(`Falha ao aplicar migrações no banco de teste (${databaseUrl}).\n${stderr}`);
  }
}
