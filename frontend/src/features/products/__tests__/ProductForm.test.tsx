import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { ProductForm } from '../ProductForm';

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<ProductForm submitLabel="Cadastrar produto" onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('ProductForm', () => {
  it('mostra erros acessíveis e não envia quando os campos obrigatórios estão vazios', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(await screen.findByText('O nome deve ter pelo menos 2 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Informe a marca.')).toBeInTheDocument();
    expect(screen.getByText('Informe ao menos um ingrediente.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do produto')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejeita imagem sem https', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/Imagem/), 'http://exemplo.com/foto.png');
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));
    expect(await screen.findByText('Use um endereço iniciado por https://')).toBeInTheDocument();
  });

  it('envia os dados normalizados com a lista de ingredientes convertida', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Nome do produto'), '  Creme Teste ');
    await user.type(screen.getByLabelText('Marca'), 'Marca Fictícia');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'HIDRATANTE');
    await user.type(screen.getByLabelText('Lista de ingredientes'), 'Aqua, Glycerin, aqua, 1,2-Hexanediol');

    expect(screen.getByText('3 ingredientes identificados.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Creme Teste',
        brand: 'Marca Fictícia',
        category: 'HIDRATANTE',
        description: null,
        imageUrl: null,
        ingredients: ['Aqua', 'Glycerin', '1,2-Hexanediol'],
      }),
    );
  });

  it('exibe no campo correto os erros de validação devolvidos pelo servidor', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos.', [
          { field: 'brand', message: 'Marca recusada pelo servidor.' },
        ]),
      );
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText('Nome do produto'), 'Creme');
    await user.type(screen.getByLabelText('Marca'), 'X');
    await user.type(screen.getByLabelText('Lista de ingredientes'), 'Aqua');
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(await screen.findByText('Marca recusada pelo servidor.')).toBeInTheDocument();
    expect(screen.getByLabelText('Marca')).toHaveAttribute('aria-invalid', 'true');
  });
});
