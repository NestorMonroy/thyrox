# Respaldo de modelo en Claude Code 2.1.286 — leído con `bin/binary`

Corpus: `_references/claude-code-bin/2.1.286/bunfs-root` (2124 chunks).
Cada afirmación cita el archivo de `outputs/` que la contiene.

## 1. El salto es un error tipado, no un booleano

`Tx` = `FallbackTriggeredError` (`symbols-fallback-core.txt`): lleva
`originalModel`, `fallbackModel`, `reason` (por defecto `"overloaded"`),
`originalError` y `blockMessage`. Se lanza en 17 sitios de 2 chunks
(`references-Tx.txt`): la capa de reintentos `wse`, la compactación `FAt`,
el bucle `Ul` y el emisor `xit`.

## 2. Los motivos son una enumeración cerrada

`sdk-model_fallback-schema.txt` (esquema del mensaje `system/model_fallback`):

| trigger | condición (cita) |
|---|---|
| `model_not_found` | modelo retirado o desconocido; un 404 de modelo |
| `permission_denied` | la organización no tiene acceso (`wlt(...)==="refused"`) |
| `overloaded` | `LK=3` 529 seguidos y hay `fallbackModel` (`symbol-wse-FAt.txt`) |
| `server_error` | pivote ante un 5xx reintentable |
| `last_resort` | error NO reintentable del primario, salvo los estados `IMo={401,407,429,404,403,413}` y los predicados `IFt` (`symbol-last-resort-exclusions.txt`): un error de la petición misma no salta |
| `model_blocked` | el interruptor por modelo lo deshabilitó; **sí salta** si hay `fallbackModel` (`tengu_off_switch_query outcome:fallback`); sin respaldo devuelve el error al usuario |

Corrección a lo dicho antes en sesión: se afirmó que `model_blocked` «no
salta». Falso: salta cuando hay respaldo; sólo sin cadena termina en error.

## 3. La cadena

- **Construcción** — `rre(primary, configured)` (`symbol-chain.txt`,
  `symbol-chain-builders.txt`): `[primary, ...chn(primary, configured)]`,
  donde `chn` aplana, quita vacíos, el propio primario y sus equivalentes.
  Si queda vacía y el proveedor es bedrock/vertex, añade la escalera
  `yb(primary)` filtrada por `Hr` (permitido) — una cadena automática.
- **Interruptor** — `G6()` = `CLAUDE_CODE_NO_MODEL_FALLBACK`: la cadena es
  `[primary]`. Es el análogo exacto de `fallback.enabled=false`.
- **Lista permitida** — `Hr(model)` filtra contra `availableModels`
  (`symbol-chain-builders.txt`): ningún respaldo sale de lo permitido.
- **Avance** — `$a({chain, from, failedModel, reason})` (`symbol-chain.txt`):
  toma el siguiente distinto del que falló. Agotada la cadena, si el motivo
  fue `overloaded` o `server_error` y el modelo fallido está en ella,
  **reintenta en el sitio** con el presupuesto completo (`inPlace`); si no,
  `target=null` → `no_usable_fallback` y se relanza el error original
  (`symbol-Ul.txt`).

## 4. Cada salto deja rastro y es de un turno

En `Ul`: `abandonAttempt("chain_advance")`, `mainLoopModel` ← respaldo,
`availabilityFallback:{primaryModel, fallbackModel}`, telemetría
`tengu_model_fallback_triggered` con `chain_index`, `reason` y **ventana de
contexto de origen y destino**, y el mensaje `system/model_fallback`
visible. El esquema dice: *«Turn-scoped — the primary is re-tried on the
next user turn»*.

## 5. Lo que thyrox ya tiene (Search Existing, primera pasada)

| Pieza | Estado |
|---|---|
| `provider/src/withRetry.ts` `FallbackTriggeredError` (originalModel, fallbackModel) | portado de la referencia; sin `reason` |
| `provider/src/anthropicHttp.ts` `fallbackModel` | UN respaldo tras agotar reintentos; `lastFallbackUsed` |
| `agent/query.ts` ~887 | cambia `mainLoopModel` y emite `tengu_model_fallback_triggered` |
| `cli/src/entry/commander.ts:367` `--fallback-model` | sólo sobrecarga, sólo con `--print` |
| `provider/src/cost/policy.ts` `recommendExecution` | selección: local más rápido, si no `claude-cli` con `fallbackReason` (texto libre), o `blocked` si `fallback.enabled=false` |
| ruta local (`printDelegation` → `localProxy` → `admittedUpstream`) | **sin respaldo**: una admisión rehusada o una unidad caída termina el ítem |

## 6. Consecuencia para el diseño

La referencia separa tres cosas que la política de thyrox funde en un
booleano: el **interruptor** (`G6`), la **cadena ordenada** (`fallbackModel[]`
dentro de `availableModels`) y los **motivos** (enumeración cerrada, con
exclusión explícita de los errores de la petición). Lo que hoy bloquea la
autoimplementación —falta de cualificación con razonamiento `none`— **no es
un motivo de salto en la referencia**: un modelo sin medir no es un modelo
«no disponible». Eso se resuelve recualificando, no con respaldo.

Métrica: declaraciones resueltas por `bin/binary symbol|literal|references`.
Ciega a: la conducta en ejecución (no se observó un salto real) y a los
nombres minificados de otras builds.
