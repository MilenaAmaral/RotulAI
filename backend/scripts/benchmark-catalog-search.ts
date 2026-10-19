import { performance } from 'node:perf_hooks';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('Defina TEST_DATABASE_URL para um banco isolado de staging/teste; não use DATABASE_URL de produção.');
}

process.env.DATABASE_URL = testDatabaseUrl;

const queries = [
  'serave hidratante',
  'hidratante cerave',
  'la roche',
  'protetor solar oleosa',
  'sabonete acne',
  'acido hialuronico',
  'ceraeve moiturizing crem',
  'proteor solar',
];

const { listPublicProducts } = await import('../src/modules/catalog/catalog.service.js');
const { prisma } = await import('../src/lib/prisma.js');

function percentile(samples: number[], percentileValue: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil((sorted.length - 1) * percentileValue)] ?? 0;
}

async function measure(query: string): Promise<number[]> {
  const params = { q: query, page: 1, pageSize: 12 };
  for (let index = 0; index < 10; index += 1) {
    await listPublicProducts(params);
  }
  const samples: number[] = [];
  for (let index = 0; index < 100; index += 1) {
    const start = performance.now();
    await listPublicProducts(params);
    samples.push(performance.now() - start);
  }
  return samples;
}

try {
  console.info('Consulta\tN\tp50 (ms)\tp95 (ms)');
  for (const query of queries) {
    const samples = await measure(query);
    console.info(`${query}\t${samples.length}\t${percentile(samples, 0.5).toFixed(1)}\t${percentile(samples, 0.95).toFixed(1)}`);
  }
} finally {
  await prisma.$disconnect();
}
