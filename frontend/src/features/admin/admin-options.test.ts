import { describe, expect, it } from 'vitest';
import { parseLines, parseSources } from './admin-options';

describe('parseLines', () => {
  it('separa somente por quebra de linha e preserva vírgulas dos nomes', () => {
    expect(parseLines('1,2-Hexanediol\r\n  Água, purificada  \n\n')).toEqual(['1,2-Hexanediol', 'Água, purificada']);
  });
});

describe('parseSources', () => {
  it('lê título, publicação, URL e observação opcional', () => {
    expect(
      parseSources('CosIng | Comissão Europeia | https://ec.europa.eu | consulta\nANVISA | Gov | https://gov.br'),
    ).toEqual({
      error: null,
      sources: [
        { title: 'CosIng', publisher: 'Comissão Europeia', url: 'https://ec.europa.eu', note: 'consulta' },
        { title: 'ANVISA', publisher: 'Gov', url: 'https://gov.br', note: null },
      ],
    });
  });

  it('indica a linha com formato inválido sem devolver fontes parciais', () => {
    expect(parseSources('A | B | https://a.org\nsomente título')).toEqual({
      sources: [],
      error: 'Fonte da linha 2: use o formato título | publicação | URL | observação opcional.',
    });
  });

  it('aceita campo vazio como lista vazia', () => {
    expect(parseSources('  ')).toEqual({ sources: [], error: null });
  });
});
