import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AccessProfile } from '../src/generated/prisma/enums.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const bootstrapSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .min(12, 'A senha inicial do administrador deve ter pelo menos 12 caracteres.')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'A senha deve ter no máximo 72 bytes.')
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'A senha deve conter letras e números.'),
});

async function bootstrapAdmin(): Promise<void> {
  const parsed = bootstrapSchema.safeParse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Configure BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD no ambiente. ${issues}`);
  }

  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!(await bcrypt.compare(password, existing.passwordHash))) {
      throw new Error('A conta informada já existe; a senha não confere e nenhum dado foi alterado.');
    }
    if (existing.role !== AccessProfile.ADMIN) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: AccessProfile.ADMIN } });
    }
    console.info(`Perfil Admin confirmado para ${email}.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: 'Admin Rotulai',
      email,
      passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS),
      role: AccessProfile.ADMIN,
    },
  });
  console.info(`Primeiro Admin criado: ${email}.`);
}

void bootstrapAdmin()
  .catch((error: unknown) => {
    console.error('Falha ao configurar o primeiro Admin:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
