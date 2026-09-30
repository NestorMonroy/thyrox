# Portar la compresión de contexto de OmniRoute a @thyrox/context-compression

## La tarea, verbatim

> «Lo de /home/user/nestormonroy/omniroute podemos usar Compresión 15–95%
> Real y separada del tema de "gratis" — reduce cuántos tokens usa cada
> tarea, sin importar el proveedor? para las siguientes implementaciones?»

Directiva del ejecutor, 2026-09-13. Confirmación de alcance vía pregunta
dirigida: RTK + Lite (no Caveman ni Aggressive/Ultra), documentando el
análisis técnico **e implementando ya** para empezar a usarlo.

## Qué se leyó, y de dónde

`/home/user/nestormonroy/omniroute` (`DietrichGebert/omniroute`, MIT),
`docs/compression/COMPRESSION_GUIDE.md` y el código fuente en
`open-sse/services/compression/`:

- `lite.ts` (257 líneas) — las cinco técnicas Lite.
- `engines/rtk/` (~4000 líneas: `commandDetector.ts`, `lineFilter.ts`,
  `smartTruncate.ts`, `filterSchema.ts`, `filterLoader.ts`,
  `tomlCompatibility.ts`, `learn.ts`, `discover.ts`, `deduplicator.ts`,
  `verify.ts`, `codeStripper.ts`, `splitCompositeCommand.ts`).
- `engines/rtk/filters/*.json` — 49 filtros, cada uno con muestra de
  verificación embebida (`tests: [{command, input, expected}]`).

## Por qué esto es distinto del tema "gratis" — verificado, no supuesto

El mecanismo opera **sobre la forma del request**, antes de que salga al
proveedor: limpieza de whitespace, recorte de salida de herramientas
ruidosa, deduplicado de mensajes. No toca cuenta, suscripción, ni modelo —
es ortogonal por completo al pool de free-tiers y al `auto/subscription`
que se analizó al clonar OmniRoute la primera vez.

## Decisión de arquitectura — NO se enruta tráfico por OmniRoute

Se descartó la vía «correr OmniRoute como proxy local y apuntar el
tráfico ahí» por dos razones, no una:

1. El transporte de una sesión de Claude Code remota es infraestructura
   del harness, fuera del alcance del agente.
2. Aunque estuviera al alcance, sería una dependencia de runtime de un
   proceso externo para algo que se puede tener nativo — el mismo criterio
   que rige el resto de las referencias de este árbol
   (`referencia-odoo-gobierna-las-decisiones.md`: la referencia gobierna el
   diseño, se construye nativo).

Se implementó **la técnica**, dentro de thyrox, con la forma real de datos
de este árbol (`ContentBlock`/`Message` del API de Mensajes de Anthropic),
no la forma de la fuente (chat OpenAI-normalizado con `role: 'tool'`).

## Dónde aterrizó — y por qué ahí

`src/packages/context-compression/`, paquete nuevo. Se consideró meterlo
dentro de `@thyrox/agent` directamente, pero es una preocupación separada
y reusable (podría comprimir salida de herramientas fuera del bucle de
agente también) — mismo criterio de tamaño de paquete que ya sigue este
árbol (`shell`, `storage`, `provider` son paquetes propios, no módulos de
`agent`).

**Trampa evitada, medida antes de escribir el primer archivo:** un import
directo de `@thyrox/agent/loop/types` para el tipo `Message` habría creado
una dependencia de paquete `context-compression → agent`, que se habría
vuelto CIRCULAR en cuanto `agent` importara `context-compression` para el
wireado (`agent → context-compression → agent`). Se resolvió con un tipo
LOCAL estructuralmente compatible (TypeScript compara por forma) — cero
dependencia de paquete en esa dirección. Verificado: `context-compression`
no depende de `agent` en su `package.json`.

## Alcance — completo para lo que declara, deferido para el resto

**Lite, completo (3 de 4 técnicas de la fuente):**

- `collapseWhitespace`, `compressToolResults` (con retroceso a límite de
  palabra), `removeRedundantContent`.
- `dedupSystemPrompt` **NO se porta — declarado, no omitido**: el API de
  Mensajes tiene un único `system: string` de nivel superior
  (`ProviderRequest.system`), no una lista de mensajes `role: 'system'`
  intercalable como el chat OpenAI-normalizado de la fuente. No existe la
  forma que esa función ataca.

**RTK, completo para el subconjunto de `RtkFilter` declarado:**

- Motor: `stripAnsi`, `dropPatterns`, `includePatterns`, `collapsePatterns`,
  `deduplicate` (líneas consecutivas idénticas), `smartTruncate` (cabeza +
  cola + patrones de prioridad para lo de en medio).
- Detección: híbrida comando+contenido con la MISMA fórmula de puntuación
  de la fuente (0.55 comando + 0.25 por patrón de contenido, tope 1.0),
  simplificada a UNA lista (el filtro declara su propio `match`) en vez de
  dos listas sincronizadas — evita la segunda fuente de verdad que
  `calibration-verified-numbers.md` prohíbe.
- Filtros iniciales: `git-status`, `git-diff`, `git-log` (porte fiel de los
  JSON de la fuente), `test-pytest` (idem), `build-typescript`/tsc (idem),
  `generic-output` (reserva, idem), y **`test-bun` (propio, no viene de
  OmniRoute)** — diseñado sobre el formato REAL de `bun test` observado
  toda esta sesión: los bloques de advertencia de consola repetidos
  EXACTOS (p. ej. "Invalid hook call" ×3 visto en
  `tool-registry/hooks/__tests__/appState.test.ts`) son la mayor fuente de
  bulto, no el veredicto — `deduplicate` los colapsa.

**Deferido, declarado en el docstring de `package.json`, no silencioso:**

- Caveman (recorte de muletillas) — riesgo semántico en prosa técnica,
  fuera del alcance elegido.
- Aggressive/Ultra (envejecimiento de historial, poda heurística) — thyrox
  YA tiene un mecanismo con ese propósito y otro criterio:
  `microcompact` en `agent/loop/index.ts` (purga tool_results VIEJOS por
  conteo, con un piso de tokens liberados). Los dos son complementarios,
  no redundantes — ver la sección siguiente.
- Compatibilidad TOML de filtros externos, `matchOutput` (mensaje de
  resumen que corta-circuita un filtro), `replace` (sustitución por
  regex), y los subsistemas de aprendizaje/descubrimiento de filtros
  (`learn.ts`, `discover.ts`).
- 42 de los 49 filtros de la fuente (docker, aws, kubectl, terraform,
  linters de otros lenguajes) — este árbol no ejecuta esos comandos hoy.
  Ampliar el registro es agregar un archivo a `filters/` y una línea al
  índice.

## RTK/Lite vs. microcompact — complementarios, no en conflicto

Dos mecanismos, dos puntos de aplicación, dos criterios:

| | Cuándo actúa | Sobre qué | Criterio |
|---|---|---|---|
| **RTK/Lite** (nuevo) | UNA vez, al crearse el tool_result | El contenido de ESE resultado | Reconoce la FORMA de la salida (git, tests, tsc) y recorta ruido conocido |
| **microcompact** (ya existía) | Por conteo, sobre resultados YA en el historial | Resultados VIEJOS enteros | Ignora la forma; purga por antigüedad con un piso de tokens liberados |

Uno reduce lo que un resultado ocupa desde el principio; el otro decide
cuándo un resultado viejo ya no vale la pena conservar. Verificado que no
compiten por el mismo punto de código: RTK/Lite se aplica dentro de
`ejecutar()`, antes del `return resultado(...)`; microcompact opera en una
función separada, sobre el arreglo de mensajes ya construido.

## Wireado — opt-in, default apagado

`ContextOptions.compressToolResults?: boolean`, default `false`. **No
cambia el comportamiento de ninguna sesión existente** sin que alguien lo
pida explícitamente — mismo criterio que ya rige `minFreedTokens`/
`persistCleared` en el mismo archivo. Se activa con:

```ts
runLoop({ ..., context: { compressToolResults: true } })
```

Punto de aplicación: `agent/loop/index.ts::ejecutar()`, justo antes de
`return resultado(...)` — con el contenido YA final (incluido lo que
`PostToolUse` haya agregado). Para `Bash`, el comando real (`llamada.input.command`)
se pasa a RTK para que no tenga que adivinar el filtro de la primera línea
de la salida.

## Verificación

- 29 tests propios del paquete (`lite.test.ts` 11, `rtkFilters.test.ts` 14
  con la muestra embebida de CADA filtro corrida genéricamente,
  `compressToolResult.test.ts` 4) — todos en verde, corridos con
  `bun test src/packages/context-compression/`.
- 2 tests de integración del wireado real
  (`agent/__tests__/contextCompressionWiring.test.ts`): un `git status`
  con ruido real pasado por el bucle completo (`runLoop` con
  `RecordedProvider`), UNA vez con la bandera apagada (control de
  anulación: el ruido llega intacto) y una vez encendida (RTK lo recorta).
- `tsc --noEmit` limpio en `src/` y en `__tests__/` del paquete nuevo.
- Suite completa de thyrox, corrida por `src/session/bg.sh` (ver «Nota
  sobre el mecanismo de segundo plano» abajo): **8341 pass, 4 fail** — los
  MISMOS 4 fallos preexistentes ya diagnosticados y documentados en
  `.claude/workbench/diagnosticar-y-arreglar-tests-en-rojo-20260912T192153/`,
  ninguno nuevo. +36 tests sobre la corrida anterior (8321 → 8357).

## Un hallazgo propio, corregido en el mismo pase

Al crear el paquete apareció una quinta falla nueva:
`tests/package/sibling_exports.test.ts` — bloque 0 exige que todo
directorio con `package.json` bajo `src/packages/` esté declarado como
workspace. La glob `src/packages/*` del `package.json` RAÍZ ya lo cubre,
pero `src/packages/package.json` (un manifiesto ANIDADO, `@thyrox/packages`)
declara una lista EXPLÍCITA y no-glob de 28 nombres — una segunda fuente de
verdad de facto que el test sí audita. Se agregó `context-compression` a
esa lista; verificado, `sibling_exports.test.ts` vuelve a 84 pass/0 fail.

## Nota sobre el mecanismo de segundo plano

Las primeras corridas de la suite completa de este pase (45-49 s,
superando el medio minuto de `trabajo-en-segundo-plano.md`) se lanzaron en
primer plano por error — corregido a mitad del pase, señalado por el
ejecutor. La corrida final de verificación se lanzó con
`src/session/bg.sh start` (log en
`.claude/jobs/suite-final-context-compression-20260913T005429/`).

## Pendiente (fuera de este pase)

- Activar `compressToolResults: true` por defecto en algún punto de
  entrada real (CLI, un agente concreto) — hoy sólo existe la capacidad,
  apagada. Decisión del ejecutor, no de este pase.
- Los 42 filtros restantes del catálogo de OmniRoute, si este árbol llega
  a ejecutar esos comandos.
- Medir el ahorro real (tokens antes/después) sobre una sesión real de
  este árbol — hoy la evidencia es funcional (los filtros hacen lo que
  dicen, verificado con muestra), no de magnitud de ahorro en producción.
