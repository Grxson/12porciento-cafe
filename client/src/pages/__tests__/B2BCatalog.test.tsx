import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import B2BCatalog from '../B2BCatalog';

const { catalog } = vi.hoisted(() => ({
  catalog: vi.fn(),
}));

vi.mock('../../api', () => ({
  b2bApi: { catalog },
}));

describe('B2BCatalog', () => {
  beforeEach(() => {
    localStorage.clear();
    catalog.mockReset();
  });

  it('permite reintentar la carga del catálogo después de un fallo', async () => {
    catalog
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<B2BCatalog />);

    expect(await screen.findByText(/no pudimos cargar el catálogo empresarial/i)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    await waitFor(() => expect(catalog).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/no hay cafés para ese filtro/i)).toBeVisible();
  });
});
