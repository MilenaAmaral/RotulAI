import { z } from 'zod';

const email = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .max(254, 'E-mail muito longo.')
  .pipe(z.email({ error: 'E-mail inválido.' }));

export const passwordSchema = z
  .string({ error: 'Informe a senha.' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'A senha deve ter no máximo 72 bytes.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'A senha deve conter letras e números.');

export const registerSchema = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(80, 'O nome deve ter no máximo 80 caracteres.'),
  email,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(200),
});

export const deleteAccountSchema = z.object({
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
