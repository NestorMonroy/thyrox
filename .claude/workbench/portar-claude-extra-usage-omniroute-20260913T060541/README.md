# Portar el bloqueo de "extra usage" de Claude, de OmniRoute a @thyrox/provider

## La tarea, verbatim

> «Quiero implementar esto en... Considera implementar en thyrox y TDD este
> ejemplo... para poder aplicarlo», con el test pegado
> (`tests/unit/claude-extra-usage.test.ts`, `node:test`/`node:assert`) contra
> `../../src/lib/providers/claudeExtraUsage.ts`,
> `../../src/lib/providers/requestDefaults.ts` y
> `../../src/shared/validation/schemas.ts`.

Esas tres rutas relativas no viven en `claude-code-nestor-monroy-tools`
(donde vive la compaction ya portada) sino en
`/home/user/nestormonroy/omniroute` (`DietrichGebert/omniroute`, MIT) —
mismo repo del que ya se portó la compresión RTK/Lite en el pase anterior de
esta sesión. Confirmado con `grep -rl isClaudeExtraUsageBlockEnabled`.

## Qué se leyó, completo, antes de escribir nada

- `src/lib/providers/claudeExtraUsage.ts` (168 líneas) — el módulo entero.
- `src/lib/providers/requestDefaults.ts` (447 líneas) — el archivo completo,
  para ubicar `normalizeProviderSpecificData` en su contexto real.
- `src/shared/validation/schemas.ts` (19 líneas, barril) y
  `src/shared/validation/schemas/provider.ts` (la definición real de
  `updateProviderConnectionSchema`, ~700 líneas).
- `src/shared/validation/providerSpecificData.ts` (596 líneas) —
  `validateProviderSpecificData`, el validador que el esquema invoca vía
  `superRefine`.
- `tests/unit/claude-extra-usage.test.ts` (107 líneas) — la fuente real del
  test pegado; coincide con lo pegado en el mensaje del ejecutor.

## Decisión de alcance — porte completo de UN módulo, recorte declarado de DOS

`claudeExtraUsage.ts` es autocontenido (cero imports externos) y cohesivo:
decide si una conexión "claude" bloquea uso extra y qué actualización de
estado le corresponde. Se porta **completo** — los 8 exports, ninguno
omitido — en `src/claudeExtraUsage.ts`.

`normalizeProviderSpecificData` y `updateProviderConnectionSchema` NO se
portan completos, y es una decisión, no un olvido:

- La fuente real de ambos maneja ~15 preocupaciones que no tienen nada que
  ver con Claude ni con extra-usage: reasoning effort/service tier de Codex,
  contexto 1M/redact/summarize de conexiones Claude-Code-compatibles,
  normalización anidada de `requestDefaults`/`cache`, `openaiStoreEnabled`,
  `preserveEncryptedReasoning`, `disableCooling`, `peakHourProtection`,
  `autoFetchModels`, `timeoutMs`, preset de OpenRouter, región de Bedrock,
  `tag`/`tags`, `excludedModels`, saneo de `customHeaders` contra una lista
  negra propia.
- Cada una de esas depende de un módulo de dominio de OmniRoute que este
  árbol no tiene (`@/domain/connectionModelRules`, `@/domain/tagRouter`,
  `@/shared/constants/openRouterPreset`, `@/shared/constants/upstreamHeaders`,
  `@/lib/providers/peakHourProtection`) — portarlas todas para que "el
  ejemplo" corra habría significado portar cinco módulos más, ninguno
  pedido y ninguno con consumidor en thyrox.
- El propio `updateProviderConnectionSchema` real valida ~20 campos de nivel
  superior (`name`, `priority`, `rateLimitOverrides`,
  `quotaWindowThresholds`, credenciales…) que pertenecen al modelo de
  conexión completo de un gateway multi-tenant — otro dominio que thyrox no
  tiene y que el test pegado no ejercita.

Lo que SÍ se porta de esos dos: la ÚNICA regla de campo que
`tests/unit/claude-extra-usage.test.ts` ejercita — `blockExtraUsage` debe
ser un booleano real o se descarta — con el resto del registro pasando
intacto. Documentado con la lista completa de lo NO portado, en el
docstring de cada archivo, para que nadie lo confunda con la función de
producción completa.

## Dónde aterrizó — y por qué ahí, no en `connections.ts`

`src/packages/provider/` ya existe y ya tiene un `connections.ts` — pero es
un porte de `ccnmt: packages/provider/src/connections.ts`, un concepto
DISTINTO: la conexión OAuth/API-key de una sesión local de Claude Code
(`ConnectionRecord` con `auth: {type: 'oauth'|'api_key', ...}`), no una fila
de conexión de un gateway multi-tenant con cuotas por facturar, `testStatus`,
`backoffLevel`, etc. Mezclar los dos tipos habría sido la misma trampa que
`lite.ts` ya evitó con tipos estructurales locales.

Se creó un tipo local `ClaudeExtraUsageConnectionState`, NO exportado (igual
que en la fuente), con solo los campos que este módulo lee y escribe — cero
acoplamiento con `ConnectionRecord`.

Tres archivos nuevos, todos flat bajo `src/` (el `"./*": "./src/*.ts"` del
`exports` de `package.json` ya los cubre sin tocar el manifiesto — a
diferencia del porte de compaction, que sí necesitó una entrada nueva
porque su barril es un `index.ts` de subdirectorio):

- `claudeExtraUsage.ts` — porte completo.
- `claudeExtraUsageNormalization.ts` — recorte de `normalizeProviderSpecificData`.
- `claudeExtraUsageSchema.ts` — recorte de `updateProviderConnectionSchema`
  + `validateProviderSpecificData` (zod v4, misma API classic —
  `superRefine`/`ZodIssueCode.custom`/`z.record(keySchema, valueSchema)`—
  confirmada contra la 4.6.2 instalada antes de escribir el archivo).

## Verificación

- `__tests__/claudeExtraUsage.test.ts`: porte fiel de las 3 pruebas de la
  fuente (`node:test` → `bun:test`) más 10 propias que cubren las 4
  funciones exportadas de `claudeExtraUsage.ts` que el test pegado no
  ejercita directamente (`isClaudeExtraUsageQueued`, `isClaudeExtraUsageState`,
  `resolveClaudeExtraUsageResetAt`, `buildClaudeExtraUsageStateClearUpdate`)
  — 13 pass, 0 fail.
- **Control de anulación**: se retiró el guard de idempotencia de
  `buildClaudeExtraUsageConnectionUpdate` (líneas 149-156 de la fuente, que
  evitan reescribir el mismo estado dos veces) y se corrió la suite — cae
  EXACTAMENTE 1 de 13 pruebas (la que depende de ese guard), ninguna más.
  Restaurado y verificado byte a byte contra la copia de respaldo
  (`diff` exit 0) antes de continuar.
- `tsc --noEmit -p tsconfig.tests.json` sobre `@thyrox/provider`: el
  paquete ya tenía 116 líneas de errores preexistentes (oauth/openai/proxy/
  runtimeHelpers, ninguno de este porte). Se confirmó moviendo los 4
  archivos nuevos fuera, corriendo `tsc` de nuevo, y comparando el conjunto
  de archivos con error — IDÉNTICO con y sin el porte presente. Los 4
  archivos nuevos no aportan ni un error.
- Suite completa del paquete: 618 pass, 0 fail, 39 archivos (antes: 38
  archivos, sin este test).
- Suite completa del monorepo, lanzada con `src/session/bg.sh`: 8595 pass,
  5 skip, 7 todo, 0 fail, 8607 tests en 546 archivos (546 = 545 + 1 archivo
  de test nuevo).

## Pendiente (fuera de este pase)

- Si algún consumidor real de thyrox necesita alguna de las ~15
  preocupaciones no portadas de `normalizeProviderSpecificData`/
  `validateProviderSpecificData`, se porta como su propio módulo
  `claudeExtraUsage*` hermano — no se agranda este archivo por adelantado.
- No hay wireado a ningún punto de entrada real (CLI, un comando, un
  agente) — hoy sólo existe la capacidad, igual que el porte de
  compresión RTK/Lite del pase anterior. Decisión del ejecutor.
