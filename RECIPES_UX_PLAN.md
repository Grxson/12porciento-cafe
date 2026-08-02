# Plan de mejora UX/UI — Sección Recetas

Alcance: solo client (`client/src/pages/Recipes.tsx`, `RecipeDetail.tsx`, `components/recipes/*`). No toca admin ni schema del server salvo donde se indique explícitamente como "requiere backend" (Fase 3).

## Diagnóstico

El modo en vivo (`RecipeLiveMode.tsx`) ya es rico: timer circular SVG, dots de progreso, swipe gestures, auto-advance, registro de brew, confetti. El problema no es falta de interactividad en el proyecto — es que:

1. **La vista por defecto (`RecipeDetail.tsx`) es la menos dinámica y la que todos ven primero.** Pasos = círculo con número + dos párrafos de texto, sin jerarquía visual, sin indicador de progreso, sin timers ni feedback.
2. **El CTA "Modo en vivo" está enterrado.** Es un icono `Play` de 20px al mismo nivel que favoritos/descargar PDF, sin texto, sin color distintivo. La mayoría de usuarios nunca lo descubre.
3. **No existe checklist de ingredientes/equipo.** El modelo `Recipe` solo tiene `temp/grind/ratio/yield` como strings sueltos en una grilla de 4 cajas idénticas — no hay "qué necesitas antes de empezar" (dosis de café, agua, filtro, dripper).
4. **Iconografía de método inconsistente.** `Recipes.tsx` usa emojis (▽ ⬡ ⊕...), `RecipeDetail.tsx` usa iconos Lucide distintos, `RecipeLiveMode` no muestra método. Tres lenguajes visuales para el mismo dato.
5. **Recetas relacionadas sin imagen** — tarjetas de puro texto, contrastan con las cards de la lista principal que sí tienen foto.
6. Receta larga (6+ pasos) en `RecipeDetail` = scroll infinito sin ubicación ("¿en qué paso voy?") hasta que entras a modo en vivo.

## Fase 1 — Alto impacto, bajo esfuerzo (client-only)

| #    | Fix                                                                                                                                                              | Archivos                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| R1-1 | CTA "Modo en vivo" a botón primario full-width (dorado, con texto), no icono perdido                                                                             | `RecipeDetail.tsx`                                             |
| R1-2 | Unificar `MethodIcon` en un solo componente compartido (Lucide, no emoji) usado en lista, detalle, relacionadas y live mode                                      | nuevo `components/recipes/MethodIcon.tsx`, refactor 3 archivos |
| R1-3 | Iconos por stat en la grilla temp/grind/ratio/yield (termómetro, ajustes, escala, taza) en vez de 4 cajas idénticas                                              | `RecipeDetail.tsx`                                             |
| R1-4 | Pasos: timeline visual — línea conectora entre círculos numerados (estilo stepper), duración como pill con icono reloj en vez de línea de texto suelta           | `RecipeDetail.tsx`                                             |
| R1-5 | Resumen de pasos arriba de la lista: "6 pasos · ~8 min total" con icono, calculado de `steps.reduce(duration)` (mismo cálculo que ya existe en `RecipeLiveMode`) | `RecipeDetail.tsx`                                             |
| R1-6 | Imagen en tarjetas de "Recetas relacionadas" (usar `MediaFrame`, mismo patrón que lista principal)                                                               | `RecipeDetail.tsx`                                             |

## Fase 2 — Estructural, sigue client-only

| #    | Fix                                                                                                                                                                                        | Detalle                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| R2-1 | Sección "Lo que necesitas" antes de los pasos: tarjeta con producto recomendado (ya existe `recipe.product`) + temp/grind/ratio/yield reordenados como checklist visual, no grilla plana   | `RecipeDetail.tsx`                                     |
| R2-2 | Progreso sticky al hacer scroll por los pasos — barra fija arriba tipo "Paso 3 de 6" via `IntersectionObserver` sobre cada step, igual sensación que live mode pero sin salir de la página | nuevo hook `useStepScrollProgress`, `RecipeDetail.tsx` |
| R2-3 | Badge "Ya preparaste esta receta" (dato ya existe vía `useBrewedRecipes`, hoy solo se usa en `Recipes.tsx`) también en `RecipeDetail.tsx`                                                  | `RecipeDetail.tsx`                                     |
| R2-4 | Distribución de valoraciones (barras 5★→1★ con %) en vez de solo promedio + lista plana                                                                                                    | `RecipeDetail.tsx`                                     |

## Fase 3 — Requiere backend/admin (fuera de alcance inmediato, solo lo dejo mapeado)

| #    | Fix                                                                                                           | Por qué requiere backend                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| R3-1 | Ingredientes estructurados por receta (café en g, agua en ml, filtro, dripper) en vez de string libre `ratio` | Nuevo campo en `Recipe`/`RecipeStep` (Prisma schema) + formulario en admin |
| R3-2 | Calculadora de porciones (x1/x2/x4) escalando dosis                                                           | Depende de R3-1 — sin datos numéricos estructurados no se puede escalar    |
| R3-3 | Checklist marcable de equipo (dripper, filtro, balanza) por método                                            | Requiere catálogo de equipo en schema                                      |

**Implementado.** Modelos `RecipeIngredient`/`RecipeEquipment` como sub-recursos por receta (mismo patrón que `RecipeStep`), sin catálogo global — evita abrir un módulo admin nuevo fuera de scope. Rutas admin `/recipes/admin/:id/ingredients*` y `/equipment*` (CRUD + reorder). Admin: `IngredientEditor`/`IngredientList` (modal, drag-reorder) y `EquipmentList` (alta inline, sin modal — campo único). Cliente: checklist marcable en `RecipeDetail.tsx` dentro de "Lo que necesitas", con selector de porciones x1/x2/x4 que escala `amount`.

Pendiente manual: `prisma db push` no se pudo ejecutar contra la base real (Docker/Postgres local no estaba corriendo). Client generado localmente con `DATABASE_URL` inline solo para tipos. Antes de usar en dev: `docker-compose up -d` → `cd server && npx prisma db push`.

## Orden sugerido

Fase 1 → build/type-check → Fase 2 → build/type-check → Fase 3 → build/type-check. Completado.
