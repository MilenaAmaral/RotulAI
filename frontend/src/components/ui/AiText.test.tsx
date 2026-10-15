import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiText } from './AiText';

describe('AiText', () => {
  it('renderiza listas e negrito sem interpretar HTML', () => {
    const { container } = render(
      <AiText text={'Resumo **importante**.\n\n- Primeiro item\n- Segundo <img src=x onerror=alert(1)>'} />,
    );
    expect(screen.getByText('importante').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/Segundo <img/)).toBeInTheDocument();
  });
});
