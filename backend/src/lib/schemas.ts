import { z } from 'zod';

const HTTPS_URL = /^https:\/\/[^\s]+$/i;

/**
 * URL opcional que precisa começar com https://. Texto vazio vira null.
 * Restringir o protocolo impede links como javascript: ou data:, que são exibidos como href na interface.
 */
export const optionalHttpsUrl = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .max(500, `${fieldLabel} deve ter no máximo 500 caracteres.`)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || HTTPS_URL.test(value), {
      message: `${fieldLabel} deve começar com https://`,
    });

/** URL obrigatória iniciada por https://. */
export const requiredHttpsUrl = (fieldLabel: string) =>
  z
    .string({ error: `Informe ${fieldLabel.toLowerCase()}.` })
    .trim()
    .max(500, `${fieldLabel} deve ter no máximo 500 caracteres.`)
    .regex(HTTPS_URL, `${fieldLabel} deve começar com https://`);
