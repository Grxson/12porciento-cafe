Sí. Yo lo implementaría como un **refactor funcional de 12% Brew en 8 fases**, tratando primero estabilidad y consistencia de datos, después flujo UX, y al final polish visual. La clave es no tocar todo al mismo tiempo: primero hacemos que el “motor de preparación” sea confiable, luego mejoramos cómo entra el usuario a ese motor.

## Objetivo del refactor

Convertir 12% Brew en un flujo cerrado y coherente:

```text
Elegir café
   ↓
Elegir método
   ↓
Elegir perfil
   ↓
Elegir receta
   ↓
Ajustar dosis / agua / ratio
   ↓
Preparar paso a paso
   ↓
Guardar resultado real
   ↓
Evaluar taza
   ↓
Dial-in
   ↓
Crear siguiente intento
   ↓
Comparar
```

Y garantizar que en todo momento exista **una sola fuente de verdad para los parámetros del brew**.

---

# Fase 0 — Estabilizar `main`

Antes de tocar funcionalidad nueva, dejar el proyecto completamente verde.

Ahora mismo tenemos fallos de:

* lint
* server tests
* typecheck
* format check

### Trabajo

Ejecutar localmente:

```bash
pnpm install --frozen-lockfile

pnpm lint
pnpm typecheck
pnpm format:check

pnpm --filter ./client test
pnpm --filter ./server test
```

Resolver absolutamente todos los fallos.

Después:

```bash
git push
```

y no continuar hasta obtener:

```text
Lint          ✅
Format        ✅
Typecheck     ✅
Client tests  ✅
Server tests  ✅
```

### Definition of Done

`main` verde en GitHub Actions.

---

# Fase 1 — Crear `BrewConfiguration`

Este es el cambio arquitectónico más importante.

Hoy tenemos parámetros de brew repartidos entre:

* `Recipe`
* `RatioCalculator`
* `BrewPrepare`
* `GuidedBrew`
* `BrewSession`

Eso permite inconsistencias.

Necesitamos una representación única:

```ts
export interface BrewConfiguration {
  recipeId: string;
  coffeeId?: string;
  brewMethodId?: string;

  coffeeDoseGrams: number;
  waterGrams: number;
  ratio: number;

  temperatureCelsius?: number;

  grindSetting?: string;
  grindMicrons?: number;

  steps: BrewStepStructured[];
}
```

Podría vivir en:

```text
packages/shared/src/types/brew.ts
```

Y agregar:

```ts
export interface BrewConfigurationChange {
  coffeeDoseGrams: number;
  waterGrams: number;
  ratio: number;
}
```

## Nuevo principio

Toda preparación debe pasar por:

```text
Recipe
   ↓
RecipeEngine
   ↓
BrewConfiguration
```

Nunca:

```text
Recipe → cálculo X
Recipe → cálculo Y
Recipe → cálculo Z
```

---

# Fase 2 — Arreglar `RatioCalculator`

Ahora el calculator debe dejar de ser un componente aislado.

## Nueva API

```tsx
<RatioCalculator
  value={brewConfiguration}
  onChange={setBrewConfiguration}
  remoteScale={...}
/>
```

O como mínimo:

```tsx
<RatioCalculator
  initialCoffee={...}
  initialWater={...}
  ratio={...}
  onChange={(configuration) => {
    setBrewConfig(configuration);
  }}
/>
```

## Comportamiento esperado

Si la receta es:

```text
20 g
300 g
1:15
```

y el usuario cambia:

```text
17 g
```

debe producir:

```text
coffee = 17
water = 255
ratio = 15
```

y además:

```text
steps = RecipeEngine.scaleRecipe(...)
```

Ejemplo:

```text
Original:
50
70
60
60
60

Escalado:
42.5
59.5
51
51
51
```

con suma:

```text
255 g
```

exacta.

---

# Regla importante

El server RecipeEngine debe ser la fuente autoritativa.

```ts
brewApi.scaleRecipe(recipe.id, coffeeDose)
```

Fallback offline:

```ts
scaleRecipeLocally(...)
```

Pero ambos deben devolver el mismo tipo:

```ts
ScaledRecipe
```

---

# Fase 3 — Conectar Calculator → StartSession

Después necesitamos corregir `BrewPrepare`.

Hoy:

```text
Calculator
↓
usuario cambia valores
↓
StartSession usa Recipe original
```

Debe convertirse en:

```text
Calculator
↓
BrewConfiguration
↓
StartSession(BrewConfiguration)
```

## Estado

En `BrewPrepare.tsx`:

```ts
const [brewConfig, setBrewConfig] =
  useState<BrewConfiguration | null>(null);
```

Cuando se carga una receta:

```ts
setBrewConfig(
  createConfigurationFromRecipe(recipe)
);
```

Calculator:

```tsx
<RatioCalculator
  configuration={brewConfig}
  onChange={setBrewConfig}
/>
```

Start:

```ts
await brewApi.startSession({
  recipeId: brewConfig.recipeId,
  coffeeId: brewConfig.coffeeId,
  brewMethodId: brewConfig.brewMethodId,

  coffeeDoseGrams: brewConfig.coffeeDoseGrams,
  waterGrams: brewConfig.waterGrams,
  ratio: brewConfig.ratio,

  temperatureCelsius: brewConfig.temperatureCelsius,
  grindSetting: brewConfig.grindSetting,
  grindMicrons: brewConfig.grindMicrons,
});
```

### Acceptance test

Seleccionar:

```text
20 g → 17 g
```

Antes de iniciar debe verse:

```text
17 g
255 g
1:15
```

Después de crear la sesión:

```text
BrewSession.coffeeDoseGrams = 17
BrewSession.waterGrams = 255
BrewSession.ratio = 15
```

---

# Fase 4 — Rehacer el estado de Guided Brew

Aquí necesitamos corregir timers, scaling y recuperación.

Yo crearía un pequeño estado explícito.

## Estado de sesión

```ts
interface GuidedBrewState {
  status:
    | 'PREPARING'
    | 'RUNNING'
    | 'PAUSED'
    | 'COMPLETED';

  currentStepIndex: number;

  brewStartedAtMs: number | null;
  stepStartedAtMs: number | null;

  pausedAtMs: number | null;

  brewPausedMs: number;
  stepPausedMs: number;

  configuration: BrewConfiguration;
}
```

---

# Timer general y timer de paso

Hay que separar:

```text
Tiempo total de brew
```

de:

```text
Tiempo de paso actual
```

## Inicio

Primer `Start`:

```ts
brewStartedAtMs = Date.now();
stepStartedAtMs = Date.now();
```

Siguientes pasos:

```ts
stepStartedAtMs = Date.now();
```

pero:

```ts
brewStartedAtMs
```

no cambia.

---

# Al completar

Guardar:

```ts
brewTimeSeconds =
  (Date.now() - brewStartedAtMs - brewPausedMs) / 1000
```

No usar:

```text
stepStartedAtMs
```

para el tiempo global.

---

# Fase 5 — Corregir acumulados y targets de agua

Actualmente hay partes que usan:

```text
recipe.steps
```

y otras:

```text
scaledSteps
```

Eso tiene que desaparecer.

Durante Guided Brew debe existir:

```ts
const activeSteps = configuration.steps;
```

Y absolutamente todo utiliza eso.

## Agua del paso

```ts
step.waterAmountGrams
```

## Acumulado

```ts
activeSteps
  .slice(0, currentStepIndex + 1)
  .reduce(...)
```

## Total

```ts
configuration.waterGrams
```

---

# Cambio de presentación

Además aprovecharía para mejorar la UX.

En vez de:

```text
Agrega
60 g

Total acumulado
180 / 300 g
```

mostrar principalmente:

# 180 g

**Objetivo en báscula**

```text
+60 g en este vertido
```

Esto es bastante más útil mientras preparas.

---

# Fase 6 — Persistencia completa del Guided Brew

El draft en `sessionStorage` debe guardar:

```ts
{
  status,

  currentStepIndex,

  brewStartedAtMs,
  stepStartedAtMs,

  pausedAtMs,

  brewPausedMs,
  stepPausedMs,

  configuration,

  savedAtMs
}
```

## Hydration

Al volver:

```text
RUNNING
```

debe volver como:

```text
RUNNING
```

y recalcular el tiempo usando timestamps.

Si estaba:

```text
PAUSED
```

debe continuar pausado.

---

# Manejo de cambio de visibilidad

También agregaría:

```ts
document.addEventListener('visibilitychange', ...)
```

No para pausar el cronómetro, sino para actualizar correctamente `now`.

Como el timer usa timestamps, no debería sufrir drift.

---

# Wake Lock

Mantener el Wake Lock actual.

Pero manejar:

```text
visibilitychange
```

porque algunos navegadores liberan el wake lock al ocultar la app.

Cuando vuelve a `visible` y:

```text
status === RUNNING
```

pedirlo nuevamente.

---

# Fase 7 — Mejorar controles del Guided Brew

No autoavanzaría directamente cuando llegue el tiempo objetivo.

Mostrar:

```text
00:45

✓ Tiempo objetivo cumplido
```

Opcional:

```text
vibración
sonido
```

## Configuración del usuario

Añadir preferencia:

```text
Aviso de paso

☑ Vibración
☑ Sonido
```

Con:

```js
navigator.vibrate?.([100, 50, 100])
```

Y un beep extremadamente corto mediante Web Audio.

---

# Fase 8 — Rediseñar `/brew/preparar`

Esta es la gran mejora de producto.

Actualmente:

```text
Preparar
↓
Elige método
```

Lo convertiría en un wizard.

---

## Paso 1 — Café

Título:

> ¿Qué café vas a preparar?

Cards:

```text
Volcán de Jalisco

Chiapas ...

Ver todos mis cafés
```

También:

```text
Otro café
```

---

## Paso 2 — Método

> ¿Cómo quieres prepararlo?

Solo métodos activos.

```text
V60
AeroPress
Moka
Chemex
French Press
...
```

Además, si el usuario tiene equipo registrado:

```text
Tus métodos
V60 02
Moka 3 tazas
```

primero.

---

## Paso 3 — Perfil

> ¿Qué quieres buscar en la taza?

```text
Dulce
Balanceado
Brillante
Frutal
Con cuerpo
Intenso
Refrescante
```

Aquí filtramos recetas.

---

## Paso 4 — Receta

Recomendación principal:

```text
12% Sweet

V60
Dulce · limpio

20 g
300 g
92 °C
1:15
```

Luego:

```text
Otras opciones
```

---

## Paso 5 — Cantidad

Ahora Calculator.

Pero mucho más simple.

```text
¿Cuánto café usarás?

[-]    17.0 g    [+]

255 g de agua

Ratio 1:15
```

Botón secundario:

```text
Ajustes avanzados
```

Ahí sí:

```text
agua
ratio
temperatura
```

---

## Paso 6 — Resumen

```text
Volcán de Jalisco
V60
12% Sweet

17 g café
255 g agua
92 °C
1:15

Molienda:
Timemore C3 · 17 clicks
```

CTA:

# Iniciar preparación

---

# Fase 9 — Integrar `Mi equipo` en Prepare

Actualmente Mi equipo funciona como inventario.

Debe convertirse en contexto.

## Ejemplo

Usuario:

```text
Timemore C3
Hario V60 02
Timemore Black Mirror
Fellow Stagg
```

Prepare debe detectar:

```text
brewMethod = V60
```

y mostrar:

> Equipo disponible

```text
✓ Hario V60 02
✓ Timemore C3
✓ Timemore Black Mirror
✓ Fellow Stagg
```

---

# Grinder mapping — primera versión

Sin hacer todavía un sistema complejo de micras.

Guardar:

```ts
grinderModel
grindSetting
```

Por ejemplo:

```text
Timemore C3
17 clicks
```

Después podremos agregar:

```text
GrinderProfile
```

con equivalencias aproximadas.

---

# Fase 10 — Mejorar `BrewEquipment`

Añadir edición.

Hoy básicamente tenemos:

```text
crear
favorito
eliminar
```

Necesitamos:

```text
editar
```

Campos:

```text
Nombre
Marca
Modelo
Categoría
Foto opcional
Favorito
Notas
```

Para molino:

```text
Tipo de ajuste

Clicks
Números
Micras
Continuo
```

---

# Fase 11 — Rediseñar Historial

Cambiar visualmente:

```text
Journal
```

por:

# Historial

## Filtros

```text
Todos
Favoritos
```

y botón:

```text
Filtros
```

Bottom sheet:

```text
Café
Método
Rating
Resultado
Fecha
```

---

# Paginación

API:

```text
?page=1&pageSize=20
```

Frontend:

```text
Cargar más
```

o infinite scroll.

Yo elegiría:

**Cargar más**

por simplicidad y accesibilidad.

---

# Fase 12 — Integrar comparación

Añadir:

```text
Seleccionar
```

en Historial.

Estado:

```ts
selectedSessions: string[]
```

Máximo:

```text
2
```

Cuando hay dos:

```text
[ Comparar 2 preparaciones ]
```

→

```text
/brew/comparar?ids=A,B
```

---

# Mejora visual de Comparison

Además de la tabla:

```text
A                   B
20g                20g
300g               300g
17 clicks          16 clicks
3:21               3:06
★★★☆☆              ★★★★★
```

Resumen:

> El segundo intento mejoró 2 puntos.

Y:

> Cambiaste únicamente:
> molienda 17 → 16 clicks.

Eso hace mucho más evidente el aprendizaje.

---

# Fase 13 — Rehacer Dial-in como parte del flujo

No tratar Dial-in como una herramienta aislada.

Debe empezar desde:

```text
BrewSession
```

---

## Al terminar una sesión

Mostrar:

> ¿Cómo quedó?

```text
Excelente
Bueno
Muy ácido
Muy amargo
Aguado
Muy fuerte
Astringente
```

Después de guardar:

```text
★★★★★
```

mostrar directamente:

# Mejorar la siguiente taza

---

# Endpoint

Yo crearía:

```http
POST /api/brew/sessions/:id/dial-in
```

El backend obtiene la sesión.

No permitimos que el cliente invente el contexto.

---

## Request

```json
{
  "result": "SOUR"
}
```

Backend lee:

```text
coffeeDose
water
ratio
temperature
grindSetting
grindMicrons
brewTime
recipe
brewMethod
```

---

# Response

```ts
interface SessionDialInRecommendation {
  variable: 'GRIND';

  direction: 'FINER';

  primaryChange:
    'Usa una molienda ligeramente más fina.';

  previous: {
    grindSetting: '17 clicks';
  };

  proposed: {
    grindSetting: '16 clicks';
  };

  reason:
    'La taza fue reportada como demasiado ácida...';
}
```

---

# Fase 14 — Crear un nuevo intento desde Dial-in

Botón:

# Preparar con este cambio

No debe reutilizar el ID anterior.

Crear:

```text
BrewSession #2
```

con:

```ts
parentSessionId: previousSession.id
```

Yo sí agregaría esta relación a DB.

---

# Migración

En `BrewSession`:

```prisma
parentSessionId String?
parentSession   BrewSession? @relation(
  "BrewIteration",
  fields: [parentSessionId],
  references: [id]
)

nextSessions BrewSession[] @relation("BrewIteration")
```

Esto permite:

```text
Attempt 1
   ↓
Attempt 2
   ↓
Attempt 3
```

---

# Bonus: Brew iteration

En Session Detail:

```text
Intento #3

Anterior ←
Siguiente →
```

Y:

```text
Progreso

#1 ★★★☆☆
↓
#2 ★★★★☆
↓
#3 ★★★★★
```

Esto tiene muchísimo valor para 12% Brew.

---

# Fase 15 — Corregir textos e internacionalización

Crear mappings centrales.

Por ejemplo:

```ts
BREW_RESULT_LABELS
```

```ts
{
  SOUR: 'Muy ácido',
  BITTER: 'Muy amargo',
  WATERY: 'Débil / aguado',
  STRONG: 'Muy fuerte',
  ASTRINGENT: 'Astringente / seco',
  BALANCED: 'Bueno',
  EXCELLENT: 'Excelente'
}
```

Y:

```ts
BREW_PROFILE_LABELS
```

No repetir mappings en:

```text
BrewHome
BrewRecipes
BrewCoffee
BrewDialIn
...
```

Mover a:

```text
packages/shared/src/constants/brew.ts
```

Corregir también:

```text
建议你
```

obviamente.

---

# Fase 16 — Mejorar navegación de Brew

Mantener los cuatro principales:

```text
Preparar
Explorar
Historial
Mi equipo
```

Eso está bien.

Pero cambiaría su comportamiento.

## Root pages

Mostrar nav en:

```text
/brew
/brew/preparar
/brew/recetas
/brew/sesiones
/brew/equipo
```

## Detail pages

Reducir visualmente en:

```text
/brew/recetas/:slug
/brew/cafes/:slug
/brew/sesiones/:id
/brew/comparar
```

Durante Guided Brew:

```text
ocultar TODO
```

Navbar global incluido.

---

# Fase 17 — Home más personal

Simplificar.

## Hero

Para visitante:

> Tengo este café y este equipo.
> **¿Cómo lo preparo?**

Para usuario:

> Buenas noches.
> **¿Qué vamos a preparar?**

CTA:

```text
Preparar café
```

---

# Después

## Si hay sesión activa

```text
Continuar preparación

V60 · 12% Sweet
Paso 3 de 6

[ Continuar ]
```

Solo:

```text
status === IN_PROGRESS
```

---

## Si no existe activa

Mostrar:

```text
Tu última taza

Volcán de Jalisco
12% Sweet · V60
★★★★★

[ Preparar otra vez ]
```

---

# Después

### Tus métodos

máximo 4–6.

---

### 12% Originals

máximo 3.

Nada más.

La home no debe competir con el catálogo entero.

---

# Fase 18 — Mejoras visuales

Aquí sí haría polish.

## Reducir borders

Menos:

```text
border
border
border
```

Más:

```text
espacio
fondos suaves
tipografía
fotografía
divisores
```

---

# Ratio Calculator

Mobile:

```text
CAFÉ             AGUA
17.0 g           255 g

RATIO
1 : 15
```

No tres columnas apretadas.

---

# Guided Brew

Jerarquía:

```text
Paso 3 de 6

SEGUNDO VERTIDO

180 g
objetivo en báscula

+60 g en este vertido

00:32 / 00:35
```

CTA grandes:

```text
Pausar

← Atrás        Siguiente →
```

---

# Touch targets

Todos:

```text
min 44x44
```

ideal:

```text
48px
```

---

# Tipografía

Reducir bastante:

```text
text-[10px]
```

Usar:

```text
12px metadata
14–16px body
18–20px controls
32–48px targets/timer
```

---

# Fase 19 — Estados de error correctos

Cada página debe distinguir:

```text
LOADING
EMPTY
ERROR
SUCCESS
```

Nunca:

```text
catch → []
```

porque error y vacío no significan lo mismo.

Especialmente:

```text
BrewEquipment
BrewCoffee
BrewPrepare
```

---

# Fase 20 — Tests nuevos

No quiero cerrar esto solo con pruebas unitarias del motor.

Necesitamos tests del flujo.

---

## Unit tests

### BrewConfiguration

```text
recipe → config
config scaling
rounding
ratio
```

### GuidedBrew reducer

```text
start
pause
resume
next step
complete
hydrate
```

---

# Integration tests

Backend:

```text
startSession custom params
snapshot
completeSession
brewTime
dial-in from session
repeat session
parentSession relation
```

---

# Client tests

Con Testing Library:

```text
change 20g → 17g
water becomes 255
start session receives 17/255
```

Este test es crítico.

---

# E2E

Yo agregaría Playwright.

Nuevo:

```text
e2e/
  brew.spec.ts
```

## Flujo crítico

```text
login
↓
/brew
↓
preparar
↓
seleccionar café
↓
V60
↓
12% Sweet
↓
17 g
↓
255 g
↓
iniciar
↓
pasos
↓
completar
↓
★★★★★
↓
historial
```

Otro:

```text
historial
↓
session
↓
SOUR
↓
dial-in
↓
crear nuevo intento
```

Otro:

```text
seleccionar 2 sesiones
↓
comparar
```

---

# Fase 21 — CI

Agregar E2E a CI.

Pipeline ideal:

```text
Install
 ↓
Format
 ↓
Lint
 ↓
Typecheck
 ↓
Unit tests
 ↓
Integration tests
 ↓
Build
 ↓
Playwright smoke
```

Solo entonces deploy.

---

# Fase 22 — QA visual

Tamaños mínimos:

```text
390x844
430x932
768x1024
1440x900
1920x1080
```

Especial atención:

```text
Brew Home
Prepare Wizard
Calculator
Guided Brew
Historial
Comparison
Dial-in
```

Tema:

```text
light
dark
```

PWA:

```text
standalone
Safari iOS
Chrome Android
desktop
```

---

# Fase 23 — Telemetría

No necesitas Google Analytics necesariamente.

Puedes crear eventos propios.

```text
brew_started
brew_completed
brew_abandoned

recipe_scaled
dial_in_requested
brew_repeated

comparison_created
```

Campos:

```text
method
recipeId
coffeeId
dose
duration
result
rating
```

Sin guardar información innecesariamente sensible.

Esto nos permitirá detectar:

> 65 % inicia preparación
> 51 % termina
> 18 % usa dial-in
> 8 % repite una preparación.

Ahí sabremos qué mejorar después.

---

# Arquitectura objetivo

Al terminar, yo quiero que quede aproximadamente así:

```text
                         ┌───────────────┐
                         │ Brew Wizard   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │ RecipeEngine  │
                         └───────┬───────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ BrewConfiguration   │
                      └──────────┬──────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
        ┌─────────────────┐            ┌──────────────────┐
        │ RatioCalculator │            │ BrewSession API  │
        └─────────────────┘            └────────┬─────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ GuidedBrew      │
                                      └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ BrewResult      │
                                      └────────┬────────┘
                                               │
                                     ┌─────────┴─────────┐
                                     ▼                   ▼
                               ┌───────────┐      ┌────────────┐
                               │ History   │      │ Dial-In    │
                               └─────┬─────┘      └──────┬─────┘
                                     │                   │
                                     ▼                   ▼
                               Comparison          New attempt
                                                       │
                                                       ▼
                                                  GuidedBrew
```

---

# Orden exacto que usaría

Si lo conviertes en sprint/backlog, mi prioridad sería:

### Sprint 1 — Reliability

```text
P0-01 CI green
P0-02 BrewConfiguration
P0-03 Calculator controlled state
P0-04 StartSession custom configuration
P0-05 Guided Brew scaling consistency
P0-06 Brew total timer
P0-07 Draft restore state
```

### Sprint 2 — Core UX

```text
P1-01 Prepare Wizard
P1-02 Coffee-first selection
P1-03 Profile selection
P1-04 Recipe recommendation
P1-05 Better calculator mobile
P1-06 Guided Brew visual hierarchy
P1-07 Active session detection
```

### Sprint 3 — Learning loop

```text
P1-08 Dial-in from session
P1-09 Session iteration relation
P1-10 Repeat with change
P1-11 Comparison selection
P1-12 Improved history
```

### Sprint 4 — Polish

```text
P2-01 Copy/i18n cleanup
P2-02 Equipment integration
P2-03 Error states
P2-04 Home redesign
P2-05 Responsive polish
P2-06 Accessibility
P2-07 Analytics
P2-08 E2E
```

---

# Qué no implementaría todavía

Evitaría por ahora:

```text
Bluetooth scales
IA generativa
chat Brew Assistant
comunidad de recetas
gráficas avanzadas
social
gamificación nueva
```

No porque sean malas ideas, sino porque ahora mismo el valor real está en perfeccionar:

# preparar → evaluar → ajustar → mejorar.

Cuando ese ciclo funcione de manera impecable, entonces sí podemos convertir 12% Brew en algo mucho más ambicioso.

Y técnicamente, **el primer ticket que debe empezar el agente es `BrewConfiguration + Calculator → StartSession`**, porque ese arreglo elimina la inconsistencia más peligrosa de todo el flujo.
