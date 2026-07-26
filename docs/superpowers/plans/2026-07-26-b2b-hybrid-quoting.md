# B2B Hybrid Quoting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the contact-only B2B experience with a responsive quote builder, a versioned commercial workflow, and transactional conversion from an accepted quote into a company and B2B order.

**Architecture:** Keep all B2B behavior under `/api/b2b` and isolate pricing/status rules in a pure domain module. Store the buyer's original request separately from editable quote snapshots, then convert an accepted quote inside one database transaction. The public client owns a locally persisted draft; the admin owns pipeline, quote versions, companies, orders, and tier configuration.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand/localStorage, Express 4, Prisma 5, PostgreSQL, Vitest, Supertest, Nodemailer/Resend.

## Global Constraints

- Public prices are estimates before taxes and must be recalculated by the server.
- Customer-facing SLA copy is exactly “menos de 24 horas hábiles”.
- A request does not create a company; company and order are created only after quote acceptance.
- No electronic signatures, CFDI automation, or public quote portal in this delivery.
- Existing products with B2B tiers remain enabled after migration.
- Installed PWA layouts must respect safe areas and never introduce horizontal scrolling.
- All new behavior follows test-driven development.

---

## File Map

### Domain and persistence

- Create `server/src/lib/b2b-domain.ts`: tier selection, overlap validation, totals, folio and status rules.
- Create `server/src/lib/__tests__/b2b-domain.test.ts`: pure domain tests.
- Modify `server/prisma/schema.prisma`: B2B product flags, inquiry items, activities, quote versions, companies and relations.
- Create `server/prisma/migrations/20260726180000_b2b_hybrid_quoting/migration.sql`: production-safe migration and tier-based backfill.

### API

- Replace `server/src/routes/b2b.ts`: unified public/admin B2B routes.
- Modify `server/src/routes/subscriptions.ts`: remove duplicate B2B creation route.
- Modify `server/src/index.ts`: apply a dedicated public B2B limiter.
- Create `server/src/routes/__tests__/b2b.test.ts`: catalog, request validation, server totals, idempotency, tiers and conversion tests.
- Modify `packages/shared/src/types/index.ts` and `packages/shared/src/api/index.ts`: canonical contracts.
- Mirror generated/shared contracts in `client/src/types/index.ts`, `client/src/api/index.ts`, `apps/admin/src/types/index.ts` and `apps/admin/src/api/index.ts` where the current app still imports local modules.

### Public client

- Create `client/src/lib/b2b-quote.ts`: draft normalization and estimate helpers.
- Create `client/src/lib/__tests__/b2b-quote.test.ts`: quote draft tests.
- Create `client/src/hooks/useB2BQuoteDraft.ts`: versioned local persistence.
- Create `client/src/components/b2b/B2BProductCard.tsx`: product/tier selection.
- Create `client/src/components/b2b/B2BQuoteSummary.tsx`: desktop rail and mobile sheet.
- Create `client/src/components/b2b/B2BInquiryForm.tsx`: three-step form.
- Replace `client/src/pages/B2BCatalog.tsx`: “Mesa de selección” page composition.
- Create `client/src/pages/__tests__/B2BCatalog.test.tsx`: public flow component tests.

### Admin

- Create `apps/admin/src/admin/B2BPipeline.tsx`: metrics, filters and pipeline/list modes.
- Create `apps/admin/src/admin/B2BInquiryDetail.tsx`: request, activity and quote workspace.
- Create `apps/admin/src/admin/B2BCompanies.tsx`: won accounts.
- Refactor `apps/admin/src/admin/B2BOrders.tsx`: orders and tiers only.
- Replace `apps/admin/src/admin/B2BInquiries.tsx` with a compatibility redirect/re-export.
- Modify `apps/admin/src/App.tsx` and `apps/admin/src/admin/AdminLayout.tsx`: explicit B2B navigation.
- Create `apps/admin/src/admin/__tests__/B2BPipeline.test.tsx`: pipeline and quotation workspace tests.

---

### Task 1: B2B domain rules

**Files:**

- Create: `server/src/lib/b2b-domain.ts`
- Test: `server/src/lib/__tests__/b2b-domain.test.ts`

**Interfaces:**

- Produces `selectTier(tiers, quantity)`, `validateTierCandidate(existing, candidate, ignoredId?)`, `calculateInquiryEstimate(products, requestedItems)`, `canTransitionInquiry(from, to)` and `createB2BFolio(sequence, date)`.

- [ ] **Step 1: Write failing tests**

Cover exact boundary tier selection, open-ended tier selection, overlap rejection, manipulated client price being irrelevant to total, invalid product rejection, legal/illegal status transitions, and folio format `B2B-YYYY-NNNNNN`.

- [ ] **Step 2: Verify RED**

Run `pnpm --filter cafe-12-server test -- src/lib/__tests__/b2b-domain.test.ts`.

Expected: FAIL because `b2b-domain.ts` does not exist.

- [ ] **Step 3: Implement minimal pure functions**

Use integer quantities, finite positive prices and two-decimal rounding. `calculateInquiryEstimate` consumes server product/tier data and requested `{ productId, quantity, frequency }` only.

- [ ] **Step 4: Verify GREEN**

Run the focused test and then `pnpm --filter cafe-12-server test`.

- [ ] **Step 5: Commit**

Commit domain tests and implementation as `feat(b2b): add quoting domain rules`.

### Task 2: Persistence model and migration

**Files:**

- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260726180000_b2b_hybrid_quoting/migration.sql`

**Interfaces:**

- Produces Prisma models `B2BInquiryItem`, `B2BActivity`, `B2BQuote`, `B2BQuoteItem`, `B2BCompany`, plus inquiry/company/quote/order relations.

- [ ] **Step 1: Add a failing schema validation check**

Run `pnpm --filter cafe-12-server exec prisma validate` after adding a temporary test reference to `prisma.b2BQuote` in the API test fixture.

Expected: TypeScript/Prisma client cannot resolve the model.

- [ ] **Step 2: Extend the schema**

Add `Product.isB2BEnabled`, `Product.b2bPriority`, inquiry `folio`, `requestId`, commercial fields and relations. Add unique quote version per inquiry and unique company RFC. Add optional `Order.b2bCompanyId` and `Order.sourceQuoteId`.

- [ ] **Step 3: Write the SQL migration**

Create tables, indexes and foreign keys; backfill `Product.isB2BEnabled = true` where a `B2BPriceTier` exists; preserve every existing inquiry.

- [ ] **Step 4: Generate and validate**

Run `pnpm --filter cafe-12-server exec prisma generate` and `pnpm --filter cafe-12-server exec prisma validate`.

- [ ] **Step 5: Commit**

Commit as `feat(b2b): add quote pipeline data model`.

### Task 3: Unified B2B API

**Files:**

- Test: `server/src/routes/__tests__/b2b.test.ts`
- Modify: `server/src/routes/b2b.ts`
- Modify: `server/src/routes/subscriptions.ts`
- Modify: `server/src/index.ts`

**Interfaces:**

- Public: `GET /api/b2b/catalog`, `POST /api/b2b/inquiries`.
- Admin: metrics/list/detail, activity, status, quote version create/send/accept, conversion, companies, orders and validated tiers.

- [ ] **Step 1: Write failing Supertest cases**

Mock Prisma at its boundary and assert: catalog excludes disabled/unpriced products; request requires contact and items; totals use server tiers; duplicate `requestId` returns the original folio; invalid tier overlaps return 400; admin routes reject unauthenticated access; conversion creates company/order/activity atomically.

- [ ] **Step 2: Verify RED**

Run `pnpm --filter cafe-12-server test -- src/routes/__tests__/b2b.test.ts`.

Expected: route contract assertions fail against the contact-only API.

- [ ] **Step 3: Implement public routes**

Normalize fields, cap item count and quantities, use the domain calculator, save request/items/activity transactionally and return `{ inquiryId, folio, estimatedSubtotal, currency, sla }`.

- [ ] **Step 4: Implement admin routes**

Add pagination/filters/metrics, activity updates, immutable quote versions, email send semantics, acceptance registration and transactional conversion.

- [ ] **Step 5: Remove duplicate creation**

Delete `/subscriptions/b2b-inquiry` and update all consumers to `/b2b/inquiries`. Keep inquiry list compatibility only until admin consumers are migrated in Task 6.

- [ ] **Step 6: Verify GREEN**

Run focused API tests, full server tests and `pnpm --filter cafe-12-server build`.

- [ ] **Step 7: Commit**

Commit as `feat(b2b): unify quotation and pipeline API`.

### Task 4: Shared contracts and client quote draft

**Files:**

- Modify: shared/local type and API modules listed in File Map.
- Test: `client/src/lib/__tests__/b2b-quote.test.ts`
- Create: `client/src/lib/b2b-quote.ts`
- Create: `client/src/hooks/useB2BQuoteDraft.ts`

**Interfaces:**

- Produces `B2BCatalogProduct`, `B2BQuoteDraftItem`, `B2BInquiryPayload`, `B2BInquiryDetail`, `B2BQuote` and `B2BCompany`.
- Produces versioned storage key `12pct:b2b-quote:v1`.

- [ ] **Step 1: Write failing draft tests**

Assert add/update/remove, deduplication by product, server tier estimate display, invalid persisted schema reset and stable `requestId`.

- [ ] **Step 2: Verify RED**

Run `pnpm --filter cafe-12-client test -- src/lib/__tests__/b2b-quote.test.ts`.

- [ ] **Step 3: Add canonical contracts**

Expose matching request/response types and API methods. Remove the old subscriptions B2B method.

- [ ] **Step 4: Implement helpers and hook**

Persist only product IDs, quantities, frequency, contact draft and request ID. Reconcile persisted lines against the latest catalog before rendering totals.

- [ ] **Step 5: Verify GREEN**

Run focused and complete client tests.

- [ ] **Step 6: Commit**

Commit as `feat(b2b): add persistent quote draft`.

### Task 5: Public “Mesa de selección” experience

**Files:**

- Create: public B2B components listed in File Map.
- Replace: `client/src/pages/B2BCatalog.tsx`

**Interfaces:**

- Consumes Task 4 hook/API.
- Produces responsive catalog, guided filters, quote rail/mobile sheet and three-step submission.

- [ ] **Step 1: Write failing component tests**

Test catalog error/retry, guided filter application, adding a product, quantity tier change, mobile summary semantics, required form fields and successful folio confirmation.

- [ ] **Step 2: Verify RED**

Run the focused B2B component test.

- [ ] **Step 3: Build product and summary components**

Use approved palette tokens, existing typography and explicit estimate copy. Desktop uses `lg:grid-cols-[minmax(0,1fr)_22rem]`; mobile uses a safe-area bottom action and focus-trapped sheet.

- [ ] **Step 4: Build form and page composition**

Implement Empresa → Contacto → Revisión steps, inline errors, retry without draft loss, success folio and draft clearing.

- [ ] **Step 5: Accessibility and motion pass**

Associate labels/inputs, name icon buttons, support keyboard interactions, focus return, `aria-live`, reduced motion and no hover-only information.

- [ ] **Step 6: Verify GREEN**

Run client tests/build and inspect at 390, 768, 1366 and 1920 widths.

- [ ] **Step 7: Commit**

Commit as `feat(client): build hybrid B2B quote experience`.

### Task 6: Admin pipeline and quotation workspace

**Files:**

- Create/refactor admin files listed in File Map.
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/admin/AdminLayout.tsx`

**Interfaces:**

- Consumes Task 3 API/contracts.
- Produces `/b2b`, `/b2b/cotizaciones`, `/b2b/empresas`, `/b2b/pedidos` and `/b2b/precios`.

- [ ] **Step 1: Add test support and failing tests**

Add Vitest/testing-library scripts to the admin only if absent, then test metric rendering, pipeline filters, detail activity, quote version creation and conversion precondition UI.

- [ ] **Step 2: Verify RED**

Run `pnpm --filter @12porciento/admin test`.

- [ ] **Step 3: Implement pipeline**

Provide metric cards, desktop board and compact table, search/filter/SLA states and informative empty/error states.

- [ ] **Step 4: Implement detail and quote versions**

Keep original request immutable. Allow line/terms editing in a draft, preview/print, send, record acceptance and show timeline.

- [ ] **Step 5: Implement companies/orders/tiers**

Separate the existing combined page, add company detail and preserve B2B order pagination. Add client/server-aligned tier validation feedback.

- [ ] **Step 6: Wire navigation**

Replace ambiguous “Clientes B2B” and “Leads B2B” labels with the explicit B2B group.

- [ ] **Step 7: Verify GREEN**

Run admin tests/build and responsive inspection.

- [ ] **Step 8: Commit**

Commit as `feat(admin): add B2B commercial pipeline`.

### Task 7: End-to-end verification and production readiness

**Files:**

- Modify tests or copy only when verification reveals a reproducible defect.

- [ ] **Step 1: Run automated verification**

Run server tests/build, client tests/build, admin tests/build, Prisma validate and `git diff --check`.

- [ ] **Step 2: Run local flow**

Create a request with two products, verify recalculated estimate and folio, create two quote versions, send/accept the second and convert to company/order.

- [ ] **Step 3: Inspect responsive UI**

Capture public and admin screenshots at the required breakpoints in light/dark themes. Confirm no horizontal overflow and correct safe-area placement.

- [ ] **Step 4: Review migration safety**

Confirm existing inquiry count is preserved and products with existing tiers are enabled by the migration.

- [ ] **Step 5: Final review**

Review changed files for authorization, PII logging, price trust boundaries and unrelated worktree changes.

- [ ] **Step 6: Commit final fixes**

Commit only reproducible verification fixes as `fix(b2b): harden hybrid quote workflow`.
