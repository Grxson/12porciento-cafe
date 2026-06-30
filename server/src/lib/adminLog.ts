import { prisma } from '../db';

export type AdminAction =
  'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE' | 'APPROVE' | 'STATUS_CHANGE' | 'ADJUST';

export type AdminEntity =
  | 'Product'
  | 'Order'
  | 'Subscription'
  | 'PromoCode'
  | 'Recipe'
  | 'Review'
  | 'Inventory'
  | 'Lote'
  | 'Caficultor'
  | 'PricingConfig'
  | 'ProductVersion'
  | 'B2BPriceTier';

export interface LogAdminActionParams {
  adminId?: string;
  action: AdminAction;
  entity: AdminEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log. Never throws — failures are silently swallowed
 * so a logging error never breaks the primary operation.
 */
export function logAdminAction(params: LogAdminActionParams): void {
  const { adminId, action, entity, entityId, metadata } = params;
  prisma.adminLog
    .create({
      data: {
        adminId: adminId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
    .catch((err) => {
      console.error('[adminLog] Failed to write audit log:', err?.message ?? err);
    });
}
