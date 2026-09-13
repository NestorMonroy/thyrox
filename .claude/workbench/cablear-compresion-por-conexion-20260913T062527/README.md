# Cablear `compressToolResults` en el flujo de conexión de proveedor

## La tarea, verbatim

> «Wire compressToolResults into the provider connection flow», seguido de
> «y podemos usar `src/lib/providers/claudeExtraUsage.ts`?» — preguntando si
> el patrón de conexión que ese porte trajo de OmniRoute (`provider` +
> `providerSpecificData`) sirve de vehículo.

## El hueco medido antes de diseñar nada

`compressToolResults` sólo existía como una bandera de sesión entera
(`ContextOptions.compressToolResults`, wireada opt-in en
`agent/loop/index.ts::ejecutar()` y expuesta por `--compress-tool-results`
en `runLoop.ts`). No había NINGÚN punto donde una CONEXIÓN concreta
decidiera esto por su cuenta -- medido con `grep`, `runLoop.ts` no resuelve
ninguna `ConnectionRecord`; construye el `Provider` directo desde
`--provider recorded|http`.

## Por qué NO se reusa `claudeExtraUsage.ts` directamente

Se investigó la respuesta a "¿podemos usarlo?" antes de decidir que no:

- `ClaudeExtraUsageConnectionState` es un tipo LOCAL, no exportado (igual
  que en la fuente) -- exportarlo ensancharía la superficie de un archivo
  cuyo docstring declara ser un porte fiel y cerrado de OmniRoute.
- `claudeExtraUsageNormalization.ts` declara explícitamente en su propio
  docstring: "Si alguno de estos vuelve a hacer falta, se porta como su
  propio módulo `claudeExtraUsage*` hermano -- no se agranda este archivo".
  `compressToolResults` ni siquiera es un campo real de OmniRoute (se
  verificó: su compresión es config GLOBAL de motor,
  `src/lib/db/compression.ts` / `compressionConfigSchemas.ts`, sin
  `connectionId` ni `providerSpecificData` en ninguna de las dos). Meterlo
  ahí habría sido atribuirle a OmniRoute algo que no tiene.

Lo que SÍ se reusa es el PATRÓN: un `providerSpecificData` de forma abierta,
con un booleano leído por `=== true` exacto y descartado si no lo es. Nuevo
archivo, mismo criterio: `connectionToolCompression.ts`, con su docstring
diciendo explícitamente que es propio de thyrox, no un porte.

## Dónde aterrizó la conexión real

`connections.ts` (el `ConnectionRecord` de sesión local, ccnmt) es la ÚNICA
conexión con persistencia real en este árbol (`getConnection`/
`saveConnection` vía `@thyrox/config`). Se le agregó
`providerSpecificData?: unknown` -- divergencia declarada frente a ccnmt,
que no lo tiene (medido en `ccnmt: packages/config/global/config.ts:246`,
8 campos, ninguno de forma abierta) -- y una función nueva,
`getConnectionContextOptions(connection)`, que devuelve
`Pick<ContextOptions, 'compressToolResults'>`.

**Corrección a mitad de pase:** el primer docstring de esa función decía
que importar `ContextOptions` desde `@thyrox/agent/loop` abriría una
dependencia nueva `provider -> agent`, evitando por eso una forma ad-hoc.
Era falso -- medido después de escribirlo: `provider/package.json` YA
depende de `@thyrox/agent` (y al revés, `agent` de `@thyrox/provider`;
ambos paquetes se importan mutuamente por subpaths distintos, sin ciclo de
archivo real). Corregido para usar el tipo real vía `Pick<>`, con la
medición citada en el propio docstring en vez de la afirmación falsa.

## Wireado en `runLoop.ts`

`--connection <id>` (nuevo, opcional): si se da, resuelve la conexión con
`getConnection` y deriva `compressToolResults` de
`getConnectionContextOptions(connection)`. Se combina con OR con la
bandera explícita existente -- cualquiera de las dos basta, y sin
`--connection` el comportamiento es idéntico al de antes de este cambio
(control implícito: ninguna invocación existente sin la bandera nueva
cambia de resultado).

## Verificación

- `connectionToolCompression.test.ts` (8) + `connectionContextOptions.test.ts`
  (3): 11 pass, 0 fail.
- **Control de anulación**: se anuló `isCompressToolResultsEnabledForConnection`
  a `() => false` y se corrió la misma suite -- caen EXACTAMENTE 3 de 11 (las
  que afirman `true`), ninguna más. Restaurado y verificado byte a byte
  contra la copia de respaldo antes de continuar.
- `tsc --noEmit` limpio en `provider` (`tsconfig.tests.json`) y en `cli`
  (`tsconfig.json`) -- ningún error nuevo en ninguno de los dos archivos
  tocados ni en los dos nuevos.
- Suite completa de `provider`: 629 pass, 0 fail, 41 archivos (antes: 39).
- Suite completa de `cli`: 167 pass, 0 fail.
- Suite completa del monorepo: 8606 pass, 0 fail, 8618 tests en 548
  archivos (antes: 546).
- `tests/package/exports.test.ts` + `sibling_exports.test.ts`: 91 pass, 0
  fail -- el archivo nuevo es flat, cubierto por el catch-all existente sin
  tocar ningún manifiesto.

## Un hallazgo aparte, NO mezclado en este pase

Al revisar manifiestos de paquete para decidir el import de `ContextOptions`,
el ejecutor señaló que "muchos `package.json` no realizan todas las
exports". Medido con el mismo algoritmo de `tests/package/exports.test.ts`
generalizado a los 29 paquetes hermanos (y corrigiendo el propio blind spot
de ese test -- excluye `.tsx` de su universo por construcción,
`entry.endsWith('.ts')` no matchea `.tsx`): **9 paquetes, 33 archivos**
genuinamente inalcanzables por su propio manifiesto, todos la misma forma
(`<dir>/index.ts` sin hermano `<dir>.ts`, así que el catch-all resuelve a un
archivo que no existe). Confirmado con importación dinámica real, no sólo
lectura de JSON: `@thyrox/command-runtime/commands/clear.js` falla con
`Cannot find module`. Registrado como tarea **#9**, separado de este commit
a propósito -- son dos cambios sin relación causal entre sí.

## Pendiente (fuera de este pase)

- Nada persiste `providerSpecificData` desde una interfaz real todavía
  (no hay UI ni comando CLI para `saveConnection` con ese campo) -- hoy
  sólo existe la capacidad, como en los dos portes anteriores de esta
  sesión. Decisión del ejecutor.
- Tarea #9, ya registrada.
