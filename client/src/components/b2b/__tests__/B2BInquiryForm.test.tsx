import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { B2BProduct, B2BQuoteDraft } from '../../../types';
import B2BInquiryForm from '../B2BInquiryForm';

const { createInquiry } = vi.hoisted(() => ({
  createInquiry: vi.fn(),
}));

vi.mock('../../../api', () => ({
  b2bApi: { createInquiry },
}));

vi.mock('../../FocusTrap', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const product: B2BProduct = {
  id: 'coffee-1',
  name: 'Oaxaca Natural',
  slug: 'oaxaca-natural',
  imageUrl: '/coffee.jpg',
  description: 'Café de especialidad',
  origin: 'Oaxaca',
  region: 'Sierra Sur',
  weight: 1000,
  sku: 'OAX-1',
  isB2BEnabled: true,
  b2bPriority: 1,
  b2bPriceTiers: [
    {
      id: 'tier-1',
      productId: 'coffee-1',
      minQty: 1,
      maxQty: null,
      pricePerUnit: 250,
      createdAt: '2026-07-26T00:00:00.000Z',
    },
  ],
};

const draft: B2BQuoteDraft = {
  version: 1,
  requestId: 'request-12345678',
  items: [{ productId: product.id, quantity: 10, frequency: 'monthly' }],
  businessType: 'CAFETERIA',
  frequency: 'monthly',
  updatedAt: '2026-07-26T00:00:00.000Z',
};

async function fillRequiredContact() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/razón social/i), 'Café Central');
  await user.type(screen.getByLabelText(/persona de contacto/i), 'Ana Pérez');
  await user.type(screen.getByLabelText(/correo corporativo/i), 'ana@central.mx');
  await user.type(screen.getByLabelText(/teléfono/i), '5512345678');
  return user;
}

describe('B2BInquiryForm', () => {
  beforeEach(() => {
    localStorage.clear();
    createInquiry.mockReset();
  });

  it('persiste el contacto conforme cambia y permite enviar sin RFC', async () => {
    localStorage.setItem('12pct:b2b-contact:v1', JSON.stringify({ businessType: 'CAFETERIA' }));
    createInquiry.mockResolvedValue({
      data: {
        data: {
          inquiryId: 'inquiry-1',
          folio: 'B2B-0001',
          estimatedSubtotal: 2500,
          currency: 'MXN',
          message: 'Registrada',
        },
      },
    });
    render(
      <B2BInquiryForm
        open
        draft={draft}
        products={[product]}
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />,
    );

    const user = await fillRequiredContact();

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('12pct:b2b-contact:v1') || '{}')).toMatchObject({
        businessType: 'CAFETERIA',
        businessName: 'Café Central',
        contactName: 'Ana Pérez',
        contactEmail: 'ana@central.mx',
        contactPhone: '5512345678',
      }),
    );

    await user.click(screen.getByRole('button', { name: /solicitar revisión/i }));

    await waitFor(() =>
      expect(createInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Café Central',
          rfc: '',
        }),
      ),
    );
    expect(localStorage.getItem('12pct:b2b-contact:v1')).toBeNull();
  });

  it('conserva el contacto y no permite cerrar mientras se envía', async () => {
    let resolveRequest!: (value: unknown) => void;
    createInquiry.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const onClose = vi.fn();
    render(
      <B2BInquiryForm
        open
        draft={draft}
        products={[product]}
        onClose={onClose}
        onCompleted={vi.fn()}
      />,
    );

    const user = await fillRequiredContact();
    await user.click(screen.getByRole('button', { name: /solicitar revisión/i }));
    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('12pct:b2b-contact:v1') || '{}')).toMatchObject({
      businessName: 'Café Central',
      contactEmail: 'ana@central.mx',
    });

    resolveRequest({
      data: {
        data: {
          inquiryId: 'inquiry-1',
          folio: 'B2B-0001',
          estimatedSubtotal: 2500,
          currency: 'MXN',
          message: 'Registrada',
        },
      },
    });
    await screen.findByText(/folio b2b-0001/i);
  });
});
