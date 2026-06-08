# Implementation Plans

Planes de implementación estructurados en fases: Planning → Coding → Testing.

## Master Roadmap

### [2026-06-08: Master Polish Roadmap](2026-06-08-master-polish-roadmap.md)

**4 initiatives consolidated:** Gallery (3–4h) → Stripe (3–4h) → Recipes (2–3h) → PWA (3–4h). Total 12–18h.
- **Gallery:** Multi-image product galleries, admin + storefront UI
- **Stripe:** 6 payment bugs fixed (idempotency, atomicity, logging, retry)
- **Recipes:** Refactor monolith into modular components + context + drag-drop
- **PWA:** Mobile polish, install prompt, bottom nav, responsive pages

**Status (verified 2026-06-08):** ALL 4 SHIPPED. Gallery, Stripe (S1–S4), Recipes refactor, PWA all on `main`; client tests 45/45 green. Doc retained as historical scope reference — nothing left to execute.

---

## Active Plans

### 1. [Recetas: CRUD Mejorado con UI/UX Interactivo](2026-06-07-recipes-crud-ui.md)

**Scope:** Refactorizar sistema de recetas con UI/UX mejorada

**Fases:**
- **Phase 1:** Planning (1 task) — análisis de arquitectura
- **Phase 2:** Coding (4 tasks) — hooks, context, componentes, admin page
- **Phase 3:** Testing (2 tasks) — tests unitarios + manual testing

**Outcomes:**
- Componentes reutilizables (RecipeList, RecipeEditor, StepEditor, StepList)
- Context centralizado (RecipesContext + hooks)
- Drag-and-drop para pasos
- Validación en tiempo real
- Filtrado (all/published/draft/premium)

---

### 2. [Stripe: Reforzamiento de Sistema de Pagos](2026-06-07-stripe-payments-hardening.md)

**Scope:** Reforzar robustez de Stripe con idempotencia, webhooks, reintentos

**Fases:**
- **Phase 1:** Planning (1 task) — diagnóstico de fallos + schema design
- **Phase 2:** Coding (5 tasks) — schema, service, endpoint, webhook, cliente
- **Phase 3:** Testing (2 tasks) — unit + integration + manual + metrics

**Outcomes:**
- PaymentIntent tracking en BD
- Idempotency keys (sin duplicados)
- Webhook handler (payment_intent events)
- Reintentos automáticos con exponential backoff
- 3D Secure support
- Logging detallado + metrics
- User-friendly error messages

---

## Execution Options

**1. Subagent-Driven (Recommended)**
- Fresh subagent per task
- Review between tasks
- Parallel testing
- Fastest iteration

**2. Inline Execution**
- Execute in this session
- Batch execution with checkpoints
- Manual progress tracking

---

## Quick Reference

| Plan | Tasks | Duration | Complexity |
|------|-------|----------|-----------|
| Recetas | 6 | 4-6 hours | Medium |
| Stripe | 10 | 6-8 hours | High |
| **Total** | **16** | **10-14 hours** | **Medium-High** |

---

## Notes

- Plans are self-contained and can be executed independently
- Each task includes exact code, commands, and expected outcomes
- All code includes type checking, testing, and commit messages
- Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` for execution
