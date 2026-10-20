import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://rotulai:rotulai@localhost:5432/rotulai_test';
const ENV_FILE = new URL('../.env', import.meta.url);

function databaseName(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
}

function sameDatabase(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return left.host === right.host && left.pathname === right.pathname;
  } catch {
    return a === b;
  }
}

/**
 * Retorna a URL do banco de teste e recusa qualquer banco que possa conter dados reais.
 * A suíte de integração executa TRUNCATE em todas as tabelas, então a proteção é obrigatória.
 */
export function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;

  if (!databaseName(url).endsWith('_test')) {
    throw new Error(
      `TEST_DATABASE_URL deve apontar para um banco cujo nome termine em "_test" (recebido: "${databaseName(url)}"). ` +
        'Os testes apagam todas as tabelas; nunca use um banco com dados reais.',
    );
  }

  const developmentUrl = existsSync(ENV_FILE) ? parse(readFileSync(ENV_FILE)).DATABASE_URL : undefined;
  if (developmentUrl && sameDatabase(url, developmentUrl)) {
    throw new Error('TEST_DATABASE_URL não pode ser o mesmo banco de DATABASE_URL do arquivo backend/.env.');
  }

  return url;
}
