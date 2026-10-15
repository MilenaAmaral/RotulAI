import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .pipe(z.email({ error: 'E-mail inválido.' })),
  password: z.string().min(1, 'Informe a senha.'),
});

export const registerFormSchema = z
  .object({
    name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(80, 'Máximo de 80 caracteres.'),
    email: z
      .string()
      .trim()
      .min(1, 'Informe o e-mail.')
      .pipe(z.email({ error: 'E-mail inválido.' })),
    password: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres.')
      .max(72, 'A senha deve ter no máximo 72 caracteres.')
      .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Use letras e números.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  });

export type LoginForm = z.infer<typeof loginFormSchema>;
export type RegisterForm = z.infer<typeof registerFormSchema>;
