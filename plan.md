# Refactor integral de 12% Brew y eliminación del módulo legacy de Recetas

Necesito que analices y mejores significativamente la implementación actual de **12% Brew** dentro de la aplicación 12% Café.

URL de producción de referencia:

https://12porciento-web-production.up.railway.app/brew

IMPORTANTE:

12% Brew YA EXISTE y probablemente parte de las funcionalidades descritas en este documento ya están implementadas.

NO reconstruyas el módulo desde cero.

Primero audita:

1. implementación actual;
2. arquitectura;
3. UX;
4. navegación;
5. rutas;
6. componentes;
7. servicios;
8. modelos;
9. base de datos;
10. API;
11. responsive;
12. accesibilidad;
13. funcionalidades ya completadas;
14. funcionalidades incompletas;
15. código duplicado;
16. funcionalidades que pertenecen al antiguo módulo de recetas.

El objetivo es realizar un **refactor evolutivo**.

---

# 1. OBJETIVO PRINCIPAL

12% Brew reemplazará completamente al módulo/pestaña existente de:

`Recetas`

Después de este cambio NO deberán coexistir conceptualmente:

`Recetas`

y

`12% Brew`

como dos productos diferentes.

12% Brew debe absorber completamente:

* descubrimiento de recetas;
* detalle de recetas;
* búsqueda;
* filtros;
* favoritos;
* recetas asociadas a cafés;
* preparación;
* preparación guiada;
* historial;
* personalización;
* dial-in.

La nueva jerarquía conceptual será:

`12% Café -> 12% Brew -> Recetas`

y NO:

`12% Café -> Recetas`

`12% Café -> 12% Brew`

Las recetas pasan a ser contenido interno de Brew.

---

# 2. AUDITORÍA OBLIGATORIA ANTES DE MODIFICAR

Antes de tocar código, inspecciona:

* navbar;
* navegación mobile;
* `/brew`;
* antigua página de recetas;
* detalles de receta;
* páginas de cafés;
* productos;
* perfil;
* historial;
* admin;
* API relacionada;
* modelos relacionados.

Inspecciona también visualmente la aplicación en desktop y mobile.

Utiliza screenshots durante la revisión si tienes Browser/Playwright disponible.

Documenta los hallazgos en:

`docs/12-percent-brew-refactor-analysis.md`

Debe contener:

## Estado actual

Qué existe.

## Funcionalidades completadas

Qué funciona correctamente.

## Problemas encontrados

UX, frontend, backend y arquitectura.

## Código reutilizable

Qué NO debe reconstruirse.

## Legacy

Qué pertenece al antiguo módulo Recetas.

## Plan

Qué será:

* preservado;
* refactorizado;
* movido;
* eliminado;
* redireccionado.

NO comiences una reimplementación masiva hasta terminar este análisis.

---

# 3. ELIMINAR “RECETAS” DE LA NAVEGACIÓN PRINCIPAL

Eliminar la opción:

`Recetas`

de:

* navbar desktop;
* menú mobile;
* sidebar;
* footer si corresponde;
* accesos redundantes.

Agregar o mantener solamente:

`12% Brew`

como entrada principal.

IMPORTANTE:

No significa eliminar las recetas.

Significa que ahora viven dentro de 12% Brew.

---

# 4. MIGRAR LAS RUTAS LEGACY

Busca todas las rutas actuales relacionadas con recetas.

Por ejemplo:

`/recipes`
`/recetas`
`/recipe/:slug`

o equivalentes existentes.

Define la nueva estructura respetando el router actual.

Preferencia conceptual:

`/brew`

`/brew/recipes`

`/brew/recipes/:slug`

`/brew/methods/:slug`

`/brew/coffee/:slug`

`/brew/session/:id`

`/brew/history`

`/brew/equipment`

No copies estas rutas literalmente si el proyecto ya utiliza otra convención.

Mantén compatibilidad mediante redirects.

Por ejemplo:

`/recetas -> /brew/recipes`

`/recipes -> /brew/recipes`

y:

`/recetas/v60-kasuya -> /brew/recipes/v60-kasuya`

cuando sea técnicamente posible.

No dejar enlaces muertos.

---

# 5. NUEVA ARQUITECTURA DE INFORMACIÓN

Simplificar la experiencia.

No quiero una aplicación llena de tabs compitiendo por atención.

La navegación primaria dentro de Brew debería reducirse aproximadamente a:

`Preparar`

`Explorar`

`Historial`

`Mi equipo`

Otros conceptos deben vivir dentro de esas secciones.

Por ejemplo:

## Explorar

Puede contener:

* recetas;
* cafés;
* métodos;
* 12% Originals;
* favoritos;
* baristas;
* colecciones.

## Historial

Puede contener:

* preparaciones;
* estadísticas;
* comparación;
* mejores brews;
* acceso a Dial-in.

Evitar convertir todos los conceptos del dominio en un elemento de navegación.

---

# 6. HOME DE 12% BREW

Refactorizar `/brew` para que su objetivo principal sea:

> iniciar una preparación.

El usuario no entra principalmente a administrar recetas.

Entra a preparar café.

La jerarquía deberá comenzar aproximadamente con:

# ¿Qué vas a preparar hoy?

Subtexto:

`Saca lo mejor de cada café con recetas guiadas y adaptadas a tu equipo.`

CTA principal:

`Preparar café`

CTA secundario:

`Explorar recetas`

Después mostrar información contextual útil.

Prioridad sugerida:

1. continuar preparación activa;
2. preparar café;
3. última preparación;
4. cafés del usuario;
5. recetas recomendadas;
6. métodos;
7. 12% Originals;
8. historial reciente.

No es obligatorio mostrar todo simultáneamente.

Mantener la página limpia.

---

# 7. PREPARACIÓN RÁPIDA

El CTA:

`Preparar café`

debe iniciar un flujo sencillo.

Flujo principal:

`Café`

↓

`Método`

↓

`Perfil / receta`

↓

`Cantidad`

↓

`Preparar`

Permitir también:

`Método`

↓

`Receta`

para usuarios que no tengan un café registrado.

No obligar al usuario a registrar previamente todos sus datos.

---

# 8. COFFEE-FIRST EXPERIENCE

Cuando el usuario tenga un café seleccionado:

ejemplo:

`Volcán de Jalisco`

mostrar:

* origen;
* proceso;
* tueste;
* notas;
* métodos recomendados.

Después:

`¿Cómo quieres prepararlo?`

Ejemplo:

V60
`Frutal · limpio · aromático`

Moka
`Chocolate · intenso · cuerpo alto`

AeroPress
`Dulce · balanceado`

Después mostrar las recetas compatibles.

El café debe sentirse como protagonista de la experiencia.

---

# 9. EXPLORAR

Transformar la antigua experiencia de recetas en:

`/brew/recipes`

o equivalente.

Conservar todo lo bueno del catálogo actual.

Mejorar las cards para que permitan entender una receta sin abrirla.

Cada card debería mostrar de forma compacta:

* nombre;
* método;
* perfil;
* café recomendado si aplica;
* dificultad;
* dosis;
* ratio;
* tiempo;
* badge del autor.

Ejemplo:

`12% Sweet`

`V60`

`Dulce · limpio`

`20 g · 1:15 · ~3:30`

`12% Original`

CTA:

`Ver receta`

y acción rápida:

`Preparar`

---

# 10. TAXONOMÍA DE RECETAS

Mantener o implementar claramente:

`12% ORIGINAL`

`BARISTA`

`COMPETITION`

`COMMUNITY`

`PERSONAL`

Pero no utilizar colores o badges excesivos.

La receta oficial de la marca debe tener una identidad claramente reconocible:

`12% Original`

---

# 11. PANTALLA DE RECETA

Separar claramente:

`consultar una receta`

de:

`prepararla`.

La página de detalle debe permitir estudiar la receta.

Mostrar:

* café;
* método;
* perfil esperado;
* dosis;
* agua;
* ratio;
* temperatura;
* molienda;
* tiempo;
* dificultad;
* equipo recomendado;
* pasos;
* autor;
* notas.

CTA dominante:

`Preparar esta receta`

CTA secundario:

`Guardar`

No iniciar automáticamente el timer.

---

# 12. RECIPE SCALING

La pantalla debe permitir modificar:

`Café: 20 g`

y recalcular:

`Agua`

`Ratio`

`Vertidos`

`Objetivos acumulados`

Ejemplo:

Original:

`20 g`

`300 g`

`1:15`

Usuario cambia a:

`17 g`

Resultado:

`255 g`

Todos los pasos deben cambiar proporcionalmente.

El RecipeEngine debe ser la única fuente de esta lógica.

NO recalcular individualmente desde diferentes componentes.

---

# 13. GUIDED BREW

La experiencia de Guided Brew debe recibir especial atención.

Debe estar diseñada para alguien que tiene enfrente:

* teléfono;
* café;
* V60/Moka/etc.;
* báscula;
* tetera.

Durante la preparación minimizar información secundaria.

Priorizar:

`01:32`

`VERTIDO 3 DE 5`

`Agrega 60 g`

`Objetivo: 180 g`

`Siguiente paso en 00:38`

Botones grandes:

`Pausar`

`Anterior`

`Siguiente`

Evitar navegación innecesaria.

---

# 14. UN PASO A LA VEZ

Guided Brew no debe mostrar un manual completo simultáneamente.

Mostrar principalmente:

## Paso actual

y de forma secundaria:

## Próximo paso

Ejemplo:

`Bloom`

`Agrega 50 g`

`Objetivo total: 50 g`

`45 segundos`

Siguiente:

`Segundo vertido hasta 120 g`

---

# 15. PROGRESO VISUAL

Agregar un indicador simple:

`Paso 3 / 6`

o:

`██████████░░░░`

No convertirlo en una animación excesiva.

La preparación debe sentirse tranquila.

---

# 16. POUR GUIDE

Si ya existe PourGuide, mejorarlo.

Si no existe, preparar un componente sencillo que pueda mostrar:

* circular;
* centro;
* espiral;
* pulso.

No hacer animaciones complejas innecesarias.

Debe complementar el paso y no distraer.

---

# 17. TIMER ROBUSTO

Revisar la implementación del timer.

NO debe depender simplemente de:

`setInterval + counter++`

Utilizar timestamps reales.

Debe tolerar:

* rerenders;
* cambio de tab;
* bloqueo temporal;
* pausas.

Si la plataforma lo permite, conservar preparación activa después de refresh.

---

# 18. SCREEN WAKE LOCK

Investigar soporte de:

`Screen Wake Lock API`

para Guided Brew.

Durante una preparación activa, intentar mantener la pantalla despierta.

Implementar fallback seguro si el navegador no lo soporta.

No bloquear funcionalidad cuando Wake Lock falle.

---

# 19. FINALIZAR PREPARACIÓN

Al completar:

`¡Café listo!`

Mostrar resumen:

`20 g`

`300 g`

`92 °C`

`3:27`

Después:

`¿Cómo quedó?`

Rating:

`★★★★★`

Feedback rápido:

`Ácido`

`Amargo`

`Aguado`

`Muy fuerte`

`Astringente`

`Poco dulce`

`Balanceado`

`Excelente`

Notas opcionales.

---

# 20. BREW SESSION

Cada preparación terminada debe crear o completar una BrewSession.

Guardar snapshot real de:

* café;
* receta;
* pasos;
* dosis;
* agua;
* ratio;
* temperatura;
* molienda;
* equipo;
* tiempo;
* modificaciones.

Nunca reconstruir una sesión histórica desde la versión actual de una receta.

---

# 21. REPEAT BREW

Desde una preparación histórica:

`Preparar otra vez`

Debe cargar exactamente los parámetros utilizados.

Ejemplo:

Receta original:

`18 clicks`

El usuario la ajustó a:

`16 clicks`

Repeat Brew debe restaurar:

`16 clicks`

---

# 22. HISTORIAL

La vista principal debe ser sencilla.

Mostrar:

* café;
* método;
* receta;
* fecha;
* rating;
* tiempo.

Filtros:

`Café`

`Método`

`Fecha`

`Rating`

CTA por sesión:

`Ver`

`Preparar otra vez`

---

# 23. DIAL-IN EN CONTEXTO

No quiero necesariamente una gran sección aislada de Dial-in.

Después de calificar una preparación:

`Quedó algo ácido`

mostrar:

# Ajusta tu siguiente taza

`Mantén todo igual.`

`Prueba una molienda ligeramente más fina.`

Explicar brevemente:

`La acidez marcada puede indicar que la extracción quedó corta.`

CTA:

`Preparar con este ajuste`

o:

`Guardar variante`

DialInEngine debe seguir siendo determinista y testeable.

---

# 24. PRINCIPIO DE UNA VARIABLE

El Dial-in debe priorizar:

`Cambiar una sola variable principal por intento.`

Evitar:

`cambia molienda + temperatura + ratio + agitación`

simultáneamente.

Queremos enseñar al usuario qué efecto produjo el cambio.

---

# 25. MI EQUIPO

Simplificar configuración.

Mostrar visualmente:

`Molino`

`Brewer`

`Báscula`

`Tetera`

`Espresso`

No convertirlo en un formulario enorme.

CTA:

`Agregar equipo`

La selección de equipo podrá posteriormente mejorar las recomendaciones.

---

# 26. MOLIENDA

Nunca mostrar conversiones falsas.

Si una receta conoce solamente:

`Media-gruesa`

mostrar eso.

Si tenemos información validada para el molino del usuario:

`Timemore C3 · 17 clicks`

mostrar ambas.

Siempre permitir registrar:

`Ajuste que utilicé`

en BrewSession.

---

# 27. INTEGRACIÓN CON CAFÉS

Revisar todas las páginas relacionadas con productos/cafés.

Cuando un café sea apto para preparación, agregar:

# Preparar este café

CTA:

`Abrir en 12% Brew`

Deep link:

`/brew/coffee/{slug}`

o convención equivalente.

---

# 28. QR READY

Cada café debe poder tener una URL permanente.

Objetivo futuro:

Bolsa física

↓

QR

↓

`12% Brew`

↓

café ya seleccionado

↓

métodos recomendados.

No es necesario generar QR todavía.

---

# 29. FAVORITOS

Evitar crear una tab principal de favoritos.

Permitir favoritos dentro de:

`Explorar`

y perfil/contexto correspondiente.

Soportar:

* recetas favoritas;
* cafés favoritos;
* brews favoritos.

---

# 30. EMPTY STATES

Revisar todas las pantallas.

Ejemplo sin historial:

# Todavía no has preparado ningún café

`Tus preparaciones aparecerán aquí para que puedas compararlas y mejorar cada taza.`

CTA:

`Preparar mi primer café`

Ejemplo sin equipo:

# Añade tu equipo

`Podremos adaptar mejor las recomendaciones a lo que utilizas en casa.`

CTA:

`Agregar equipo`

No mostrar tablas vacías.

---

# 31. LOADING STATES

Implementar:

* skeletons;
* loaders locales;
* optimistic feedback donde corresponda.

No bloquear una página completa por una petición secundaria.

---

# 32. ERROR STATES

Errores deben explicar qué ocurrió.

Evitar:

`Something went wrong`

Preferir:

`No pudimos cargar tus recetas.`

CTA:

`Reintentar`

Durante Guided Brew, un fallo del backend NO debe destruir inmediatamente una preparación activa.

---

# 33. MOBILE FIRST

Auditar específicamente:

`320px`

`375px`

`390px`

`430px`

tablet

desktop.

Guided Brew tiene prioridad absoluta en mobile.

Comprobar:

* botones;
* sticky actions;
* safe areas;
* navegación;
* modal height;
* textos;
* cronómetro;
* formularios.

---

# 34. INTERACCIÓN CON UNA MANO

Durante Guided Brew, ubicar acciones frecuentes donde sean cómodas en mobile.

No colocar controles esenciales pequeños en la parte superior.

Target mínimo recomendado:

`44x44px`

o equivalente apropiado.

---

# 35. ACCESIBILIDAD

Auditar:

* focus visible;
* keyboard;
* labels;
* aria;
* contraste;
* reduced motion;
* lectores de pantalla.

No utilizar únicamente:

`verde = bueno`

`rojo = malo`

Debe existir texto/iconografía complementaria.

---

# 36. DISEÑO

Mantener la identidad existente de 12% Café.

El módulo debe sentirse:

`premium`

`editorial`

`artesanal`

`mexicano contemporáneo`

`minimalista`

Evitar:

* dashboard SaaS genérico;
* exceso de gradients;
* glassmorphism gratuito;
* exceso de badges;
* cards dentro de cards;
* demasiados bordes;
* iconos innecesarios.

El café debe dominar visualmente.

---

# 37. JERARQUÍA

Utilizar tamaño, espacio y tipografía para establecer prioridad.

En Brew:

PRIMARIO:

`Preparar café`

SECUNDARIO:

`Explorar`

TERCIARIO:

`Administración / historial / configuración`

No dar a todas las acciones el mismo peso visual.

---

# 38. RECETAS Y CONTENIDO PÚBLICO

Actualmente la aplicación está altamente renderizada del lado del cliente.

Auditar si las páginas públicas de:

* café;
* receta;
* método;

pueden ser indexadas y compartidas correctamente.

Si el stack lo permite, implementar:

* SSR;
* SSG;
* prerender;
* metadata dinámica;

según la arquitectura existente.

No migrar de framework solamente por SEO.

---

# 39. METADATA

Para páginas públicas generar:

`title`

`description`

OpenGraph

Twitter cards si corresponde

canonical

Ejemplo:

`12% Sweet — Receta V60 | 12% Brew`

Descripción:

`Prepara una V60 dulce y balanceada con la receta 12% Sweet.`

---

# 40. SOCIAL SHARE READY

Preparar recetas públicas para poder compartirlas.

Ejemplo:

`Compartir receta`

URL permanente.

No es necesario desarrollar una red social.

---

# 41. ADMIN

No duplicar administración.

Las recetas de Brew deben administrarse desde el admin existente.

Revisar UX del editor.

Debe permitir:

* receta;
* método;
* dosis;
* ratio;
* temperatura;
* molienda;
* pasos;
* perfil;
* autor;
* café;
* publicación.

Especialmente mejorar la creación/reordenación de pasos.

---

# 42. ELIMINAR LEGACY

Después de migrar:

buscar globalmente referencias a:

`recipes`

`recetas`

según nomenclatura existente.

Clasificar cada aparición.

NO borrar ciegamente nombres de dominio como `BrewRecipe`.

Eliminar solamente:

* navegación antigua;
* componentes duplicados;
* routes obsoletas;
* llamadas API innecesarias;
* páginas que Brew haya sustituido.

Mantener redirects cuando existan URLs públicas antiguas.

---

# 43. ANALÍTICA

Si existe sistema de analytics, instrumentar:

`brew_home_viewed`

`brew_prepare_clicked`

`brew_coffee_selected`

`brew_method_selected`

`brew_recipe_selected`

`brew_started`

`brew_completed`

`brew_abandoned`

`brew_scaled`

`brew_rating_submitted`

`brew_dial_in_applied`

`brew_repeated`

Esto permitirá encontrar fricción real posteriormente.

---

# 44. PERFORMANCE

Auditar:

* bundle;
* imágenes;
* lazy loading;
* consultas;
* waterfalls;
* N+1;
* renders innecesarios.

12% Brew debe abrir rápido especialmente desde QR/mobile.

No descargar todo el catálogo para iniciar una sola preparación.

---

# 45. OFFLINE / NETWORK RESILIENCE

Sin construir todavía una experiencia offline completa:

una Guided Brew iniciada debería intentar continuar aunque momentáneamente se pierda conexión.

La lógica central del timer y pasos no debe depender continuamente del backend.

Sincronizar BrewSession después cuando sea posible, según capacidades del proyecto.

---

# 46. PWA READY

Evaluar la arquitectura para futura PWA.

No implementar una PWA completa si implica sobreingeniería.

Pero evitar decisiones que impidan:

* Add to Home Screen;
* offline assets;
* Wake Lock;
* notifications futuras.

---

# 47. TESTS E2E

Agregar o actualizar tests para el flujo crítico:

`/brew`

↓

`Preparar café`

↓

seleccionar café

↓

seleccionar V60

↓

seleccionar receta

↓

cambiar 20 g a 17 g

↓

ver 255 g

↓

iniciar

↓

avanzar pasos

↓

terminar

↓

rating

↓

feedback

↓

guardar

↓

historial

↓

repetir.

Este flujo es crítico.

---

# 48. TEST DE MIGRACIÓN DE RECETAS

Comprobar:

* antiguos favoritos;
* URLs;
* asociaciones con cafés;
* autores;
* pasos;
* imágenes;
* IDs.

No perder datos cuando se elimine la antigua interfaz.

---

# 49. CRITERIO DE DISEÑO CENTRAL

Constantemente pregúntate:

> ¿Esto ayuda al usuario a preparar mejor su café?

Si la respuesta es no y simplemente agrega complejidad administrativa, reconsidera su posición en la interfaz.

---

# 50. EXPERIENCIA OBJETIVO

Quiero que un usuario pueda hacer:

`Abrir 12% Brew`

↓

`Preparar café`

↓

`Volcán de Jalisco`

↓

`V60`

↓

`12% Sweet`

↓

`17 g`

↓

la app calcula `255 g`

↓

`Iniciar`

↓

Guided Brew

↓

`Finalizar`

↓

`★★★★☆`

↓

`Un poco ácido`

↓

`Prueba molienda ligeramente más fina`

↓

`Preparar así la próxima vez`

sin sentir que tuvo que navegar por una aplicación administrativa.

---

# 51. NO SOBREINGENIERÍA

NO implementar todavía salvo que ya exista infraestructura:

* IA generativa;
* machine learning;
* Bluetooth completo;
* comunidad completa;
* marketplace;
* sistema complejo de achievements;
* microservicio separado;
* event sourcing.

Primero queremos perfeccionar:

`Coffee -> Recipe -> Guided Brew -> Feedback -> Better Brew`

---

# 52. DEFINITION OF DONE

El trabajo NO está terminado únicamente porque compile.

Debe cumplirse (estado 2026-08-28):

- [x] `Recetas` desapareció del navbar.
- [x] 12% Brew es el único punto de entrada a recetas (client; `/api/recipes` público del server permanece porque admin CRUD y `ProductDetail` lo usan).
- [x] Las antiguas URLs relevantes redirigen correctamente (`/recetas` → `/brew/recetas`, `/recetas/:slug` → `/brew/recetas/:slug`).
- [x] La home de Brew prioriza preparar.
- [x] El catálogo existe dentro de Brew (Explorar + `/brew/cafes`).
- [x] Recipe scaling funciona (server `brewApi.scaleRecipe` en detalle y Guided Brew, fallback local).
- [x] Guided Brew funciona correctamente (+ Wake Lock y badge "Tiempo cumplido").
- [ ] Mobile funciona correctamente (validación visual 390×844 pendiente: sin browser tool en entorno).
- [x] Timer es robusto (pre-existente, verificado en auditoría).
- [x] BrewSession conserva snapshots (pre-existente).
- [x] El usuario puede calificar (pre-existente).
- [x] El usuario recibe Dial-in (pre-existente en `BrewSessionDetail`).
- [x] Puede repetir una preparación (pre-existente `repeatSession`).
- [x] Los cafés enlazan con Brew (`/brew/cafes/:slug` en ProductDetail y Home).
- [x] Los estados vacíos están diseñados (pre-existente).
- [x] Errores están tratados.
- [ ] Build pasa (bloqueado: `pnpm.exe` Device Guard; `tsc --noEmit` OK en client/admin/server).
- [x] Tests pasan (`npx vitest run` client: 47 tests OK).
- [ ] Lint pasa (bloqueado: husky/pnpm no ejecutables en entorno).
- [x] Typecheck pasa (client, apps/admin, server).
- [ ] No existen errores relevantes de consola (validación visual pendiente).

---

# 53. VALIDACIÓN VISUAL FINAL

Revisar visualmente:

Home 12% Brew

Explorar recetas

Detalle de receta

Selección de café

Selección de método

Ratio calculator

Guided Brew inicial

Guided Brew intermedio

Guided Brew pausado

Resultado

Dial-in

Historial

Detalle de BrewSession

Mi equipo

Mobile menu

Admin de receta

Validar mínimo en:

`390x844`

y:

`1440x900`

Capturar screenshots de antes/después si las herramientas disponibles lo permiten.

---

# 54. REPORTE FINAL

Crear:

`docs/12-percent-brew-refactor-report.md`

Incluir:

## Resumen ejecutivo

Qué cambió.

## Auditoría inicial

Problemas encontrados.

## Navegación

Qué se eliminó/movió.

## Legacy Recipes

Qué ocurrió con el módulo antiguo.

## Rutas

Rutas nuevas, eliminadas y redirects.

## Frontend

Componentes creados/modificados.

## Backend

Cambios.

## Base de datos

Migraciones.

## RecipeEngine

Estado.

## Guided Brew

Estado.

## Dial-in

Estado.

## Responsive

Resultados.

## Accesibilidad

Cambios.

## SEO

Cambios.

## Performance

Hallazgos.

## Tests

Resultados.

## Archivos modificados

Listado.

## Pendientes

Backlog real.

---

# 55. REVISIÓN FINAL

Ejecuta según el stack existente:

* formatter;
* lint;
* typecheck;
* unit tests;
* integration tests;
* E2E;
* production build.

Luego revisa el diff completo.

Busca:

* código muerto;
* imports sin usar;
* routes legacy;
* componentes duplicados;
* TODOs;
* errores;
* logs de debug;
* `console.log`;
* textos inconsistentes;
* problemas mobile.

Corrige los encontrados.

---

# RESULTADO ESPERADO

12% Brew debe dejar de sentirse como:

> una colección de recetas añadida al ecommerce.

Debe sentirse como:

> el compañero de preparación de 12% Café.

El producto físico y el producto digital deben conectarse:

`Café 12%`

↓

`12% Brew`

↓

`Preparación`

↓

`Resultado`

↓

`Aprendizaje`

↓

`Mejor siguiente taza`

Esa debe ser la experiencia central que guíe todo este refactor.
