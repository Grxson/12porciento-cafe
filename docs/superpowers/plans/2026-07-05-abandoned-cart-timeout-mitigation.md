# Abandoned Cart Email Timeout Mitigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent POST `/api/abandoned-cart/send-reminder` from blocking on SMTP calls and causing 504 timeouts.

**Architecture:** Fire-and-forget pattern — respond to the HTTP request immediately after validating the cart, then send the email in the background without awaiting it. Add a 10s timeout guard inside `sendMail()` so a hung SMTP connection can never block the Node event loop indefinitely. No new infrastructure (no Redis, no queue).

**Tech Stack:** Express, TypeScript, Prisma, nodemailer (existing `sendMail()`)

## Global Constraints

- No new external dependencies (no Bull, no Redis) — production has no Redis service
- Node.js 18+, TypeScript strict mode
- Caveman-mode commits (concise, no fluff)
- Response shape for `/send-reminder` changes from `{ success: boolean }` to `{ queued: true }` — the endpoint no longer knows delivery outcome synchronously
- Exact file paths required in every step

---

## File Structure

**Server files to modify:**

- `server/src/lib/mail.ts` — add 10s timeout guard around SMTP call
- `server/src/routes/abandoned-cart.ts` — refactor `/send-reminder` to fire-and-forget

**Admin files to modify:**

- `apps/admin/src/admin/AbandonedCarts.tsx` — update toast copy for fire-and-forget response

---

## Task 1: Add Timeout Guard to sendMail()

**Files:**

- Modify: `server/src/lib/mail.ts`

**Interfaces:**

- Consumes: existing `sendMail()` function signature — `sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<boolean>`
- Produces: same signature, now resolves `false` (never hangs) if SMTP doesn't respond within 10s

**Steps:**

- [ ] **Step 1: Read current mail.ts**

```bash
cat server/src/lib/mail.ts
```

- [ ] **Step 2: Locate the SMTP send call**

Find this line (or equivalent) inside `sendMail()`:

```typescript
await smtpTransport!.sendMail({
  from: `"12% Café" <${from}>`,
  to,
  subject,
  html,
  text: text || html.replace(/<[^>]+>/g, ''),
});
```

- [ ] **Step 3: Wrap it in a 10s timeout race**

Replace the send call with:

```typescript
const timeoutPromise = new Promise<'timeout'>((resolve) => {
  setTimeout(() => resolve('timeout'), 10000);
});

const result = await Promise.race([
  smtpTransport!.sendMail({
    from: `"12% Café" <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  }),
  timeoutPromise,
]);

if (result === 'timeout') {
  console.warn(`[mail] SMTP timeout after 10s sending to ${to}`);
  return false;
}
```

Keep the function's existing `return true;` (or equivalent success path) after this block — do not change the success return value.

- [ ] **Step 4: Run TypeScript check**

```bash
cd server && pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd server
git add src/lib/mail.ts
git commit -m "fix(mail): add 10s SMTP timeout so sendMail never hangs"
```

---

## Task 2: Make /send-reminder Fire-and-Forget

**Files:**

- Modify: `server/src/routes/abandoned-cart.ts`

**Interfaces:**

- Consumes: `sendMail()` from Task 1 (unchanged signature)
- Produces: `/send-reminder` responds `{ queued: true }` immediately after validation, before SMTP resolves

**Steps:**

- [ ] **Step 1: Read current /send-reminder handler**

```bash
sed -n '53,95p' server/src/routes/abandoned-cart.ts
```

- [ ] **Step 2: Restructure — respond before awaiting sendMail**

Replace the full `router.post('/send-reminder', ...)` handler body with:

```typescript
router.post('/send-reminder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.body;
    const cart = await prisma.abandonedCart.findUnique({ where: { id } });
    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }
    if (cart.recovered) {
      res.status(400).json({ error: 'Carrito ya recuperado' });
      return;
    }

    const items = JSON.parse(cart.items) as {
      name?: string;
      quantity: number;
      price?: number;
    }[];
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🛒 ¡Tu carrito te espera!</h2>
        <p>Notamos que dejaste algunos productos en tu carrito:</p>
        <ul>${items.map((i) => `<li>${i.name || 'Producto'} x${i.quantity}${i.price ? ` — $${i.price}` : ''}</li>`).join('')}</ul>
        ${cart.couponCode ? `<p>🔑 Tu código <strong>${cart.couponCode}</strong> sigue activo.</p>` : ''}
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/checkout"
           style="display: inline-block; padding: 12px 24px; background: #B8860B; color: white; text-decoration: none; border-radius: 8px;">
          Completar mi compra
        </a>
      </div>
    `;

    // Respond immediately — do not block the request on SMTP latency.
    res.json({ queued: true });

    // Fire-and-forget: send in background, log outcome, never throw into the request cycle.
    sendMail({ to: cart.email, subject: '🛒 ¡Tu carrito de 12% Café te espera!', html: emailHtml })
      .then((sent) =>
        sent
          ? prisma.abandonedCart.update({
              where: { id },
              data: { reminderSentAt: new Date(), reminderCount: { increment: 1 } },
            })
          : console.warn(`[abandoned-cart] Reminder email not sent for cart ${id}`),
      )
      .catch((err) =>
        console.error(`[abandoned-cart] Background send failed for cart ${id}:`, err),
      );
  } catch (error) {
    console.error('[abandoned-cart] Send reminder error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al enviar recordatorio' });
    }
  }
});
```

Note the `if (!res.headersSent)` guard in the catch block — once `res.json({ queued: true })` has run, the catch block for a later background failure must not attempt to send a second response.

- [ ] **Step 3: Run TypeScript check**

```bash
cd server && pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual smoke test**

Start the server (`cd server && pnpm dev`) and confirm the endpoint returns immediately:

```bash
time curl -X POST http://localhost:3001/api/abandoned-cart/send-reminder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-admin-token>" \
  -d '{"id":"<existing-cart-id>"}'
```

Expected: `{"queued":true}` returned in well under 1s (not waiting on SMTP).

- [ ] **Step 5: Commit**

```bash
cd server
git add src/routes/abandoned-cart.ts
git commit -m "fix(abandoned-cart): fire-and-forget email send to stop 504 timeouts"
```

---

## Task 3: Update Admin UI Toast Copy

**Files:**

- Modify: `apps/admin/src/admin/AbandonedCarts.tsx`

**Interfaces:**

- Consumes: `/send-reminder` response now `{ queued: true }` (Task 2) instead of `{ success: boolean }`
- Produces: `handleSendReminder` reflects the new response shape; toast no longer claims delivery confirmation

**Steps:**

- [ ] **Step 1: Read current handleSendReminder**

```bash
sed -n '37,51p' apps/admin/src/admin/AbandonedCarts.tsx
```

- [ ] **Step 2: Update the handler**

Replace:

```typescript
const handleSendReminder = async (id: string) => {
  setSendingId(id);
  try {
    const res = await sendReminder(id);
    if (res.data.success) {
      addToast('Recordatorio enviado', 'success');
    } else {
      addToast('No se pudo enviar el recordatorio (sin proveedor de correo)', 'info');
    }
  } catch {
    addToast('Error al enviar recordatorio', 'error');
  } finally {
    setSendingId(null);
  }
};
```

with:

```typescript
const handleSendReminder = async (id: string) => {
  setSendingId(id);
  try {
    const res = await sendReminder(id);
    if (res.data.queued) {
      addToast('Recordatorio en camino', 'success');
    } else {
      addToast('No se pudo encolar el recordatorio', 'error');
    }
  } catch {
    addToast('Error al enviar recordatorio', 'error');
  } finally {
    setSendingId(null);
  }
};
```

- [ ] **Step 3: Check useAbandonedCartsQuery.ts for the response type**

```bash
grep -n "success\|sendReminder" apps/admin/src/admin/hooks/useAbandonedCartsQuery.ts
```

If the hook's return type annotation names a `success: boolean` field for `sendReminder`, update it to `queued: boolean` to match the new server response. If the hook has no explicit type annotation (relies on inference), no change needed there.

- [ ] **Step 4: Run TypeScript check**

```bash
cd apps/admin && pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd apps/admin
git add src/admin/AbandonedCarts.tsx src/admin/hooks/useAbandonedCartsQuery.ts
git commit -m "fix(admin-ui): reflect fire-and-forget reminder response"
```

---

## Self-Review

✅ **Spec coverage:**

- Timeout guard on SMTP call (Task 1)
- Endpoint no longer awaits SMTP before responding (Task 2)
- Admin UI matches new response contract (Task 3)

✅ **No placeholders:** all code blocks complete, exact commands given.

✅ **Type consistency:** response shape `{ queued: true }` used identically across Task 2 (server) and Task 3 (client).

✅ **No new infra:** confirmed no Bull/Redis — matches Global Constraints and production's actual service list (web/admin/server/Postgres only).
