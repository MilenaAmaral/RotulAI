// Executado antes de cada arquivo de teste, antes de qualquer import da aplicação.
import { resolveTestDatabaseUrl } from './test-database.js';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-32-characters-0123456789';
process.env.BCRYPT_ROUNDS = '4';
process.env.AI_PROVIDER = 'none';
process.env.ANTHROPIC_API_KEY = '';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.AI_RATE_LIMIT_PER_MINUTE = '100';
process.env.AI_MAX_INPUT_CHARS = '500';
