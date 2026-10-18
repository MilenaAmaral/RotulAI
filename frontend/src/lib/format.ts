import type { ProductCategory } from '../types/api';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  LIMPEZA: 'Limpeza',
  TONICO: 'Tônico',
  SERUM: 'Sérum',
  HIDRATANTE: 'Hidratante',
  PROTETOR_SOLAR: 'Protetor solar',
  ESFOLIANTE: 'Esfoliante',
  MASCARA: 'Máscara',
  OLHOS: 'Área dos olhos',
  LABIOS: 'Lábios',
  TRATAMENTO: 'Tratamento',
  OUTRO: 'Outro',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<[ProductCategory, string]>;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (value: string | Date) => dateFormatter.format(new Date(value));
export const formatDateTime = (value: string | Date) => dateTimeFormatter.format(new Date(value));

export function formatRelative(value: string | Date, now = new Date()): string {
  const diffMs = now.getTime() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return formatDate(value);
}

export const pluralize = (count: number, singular: string, plural: string) =>
  `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : plural}`;

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
