/**
 * Porte PARCIAL DECLARADO de
 * `ccnmt: packages/permission/src/getNextPermissionMode.ts` (102 líneas,
 * 2 exports, licencia UNLICENSED — reimplementación, no copia).
 *
 * PORTADA (1 de 2) — `getNextPermissionMode`, la función de decisión que
 * calcula el siguiente modo al ciclar con Shift+Tab:
 *
 *   `getNextPermissionMode`
 *
 * OMITIDA (1 de 2), declarada por nombre, línea y bloqueo:
 *
 *   - `cyclePermissionMode` (`getNextPermissionMode.ts:80-102`) — llama
 *     `transitionPermissionMode` de `./permissionSetup.js`, un archivo de
 *     1538 líneas no portado en este pase (bloqueado por el subsistema de
 *     feature-gates GrowthBook/Statsig y por `ToolPermissionContext` del
 *     paquete `tool-registry`, ninguno de los dos presente en este árbol).
 *
 * Divergencia declarada — `canCycleToAuto`: la fuente, cuando
 * `feature('TRANSCRIPT_CLASSIFIER')` está activo, decide si se puede
 * ciclar a `'auto'` consultando `isAutoModeGateEnabled()`/
 * `getAutoModeUnavailableReason()` de `./permissionSetup.js` (no portado)
 * y registra el motivo con `logForDebugging` de
 * `@claude-code-how-works/local-observability/debug.js` (tampoco linkeado
 * en `node_modules` de este paquete). Este puerto reemplaza esa consulta
 * por `return false` fijo — **nunca** ofrece el ciclo a `'auto'` sin
 * importar el estado del feature-gate. Es la lectura FAIL-CLOSED
 * correcta: retirar la vía de entrada a un modo es más restrictivo que la
 * fuente, nunca menos — no es una relajación del veredicto, es un
 * subconjunto estricto del comportamiento real. El resto del `switch`
 * (los cinco modos no relacionados con 'auto': `default` sin ant,
 * `acceptEdits`, `plan`, `bypassPermissions`, `dontAsk`, y el `default:`
 * final) es IDÉNTICO a la fuente, carácter por carácter.
 *
 * Un segundo efecto de esa misma divergencia: la rama `default` bajo
 * `process.env.USER_TYPE === 'ant'` sigue intacta (usa `bypassPermissions`
 * si está disponible, si no `canCycleToAuto` — que ahora siempre da
 * `false` — y si no `'default'`), y con esta lectura fail-closed su
 * comportamiento en este árbol es indistinguible del de un usuario no-ant
 * cuando el clasificador está apagado, que es el caso universal aquí.
 */
import type { PermissionMode } from './permissionTypes.js'

// V7 — tipo local angosto: sólo los tres campos que este archivo lee.
// Mismo patrón que `permissions.ts` ya usa para su propio
// `ToolPermissionContext` (ver su docstring).
type ToolPermissionContext = {
  mode: PermissionMode
  isBypassPermissionsModeAvailable: boolean
  isAutoModeAvailable?: boolean
}

// Divergencia declarada arriba: nunca ofrece el ciclo a 'auto' en este
// árbol — subsistema de feature-gates no portado.
function canCycleToAuto(_ctx: ToolPermissionContext): boolean {
  return false
}

/**
 * Determina el siguiente modo de permiso al ciclar con Shift+Tab.
 */
export function getNextPermissionMode(
  toolPermissionContext: ToolPermissionContext,
  _teamContext?: { leadAgentId: string },
): PermissionMode {
  switch (toolPermissionContext.mode) {
    case 'default':
      // Los ants se saltan acceptEdits y plan — el modo automático los reemplaza.
      if (process.env.USER_TYPE === 'ant') {
        if (toolPermissionContext.isBypassPermissionsModeAvailable) {
          return 'bypassPermissions'
        }
        if (canCycleToAuto(toolPermissionContext)) {
          return 'auto'
        }
        return 'default'
      }
      return 'acceptEdits'

    case 'acceptEdits':
      return 'plan'

    case 'plan':
      if (toolPermissionContext.isBypassPermissionsModeAvailable) {
        return 'bypassPermissions'
      }
      if (canCycleToAuto(toolPermissionContext)) {
        return 'auto'
      }
      return 'default'

    case 'bypassPermissions':
      if (canCycleToAuto(toolPermissionContext)) {
        return 'auto'
      }
      return 'default'

    case 'dontAsk':
      // Aún no expuesto en el ciclo de UI, pero devuelve default si de
      // algún modo se alcanza.
      return 'default'

    default:
      // Cubre auto (cuando TRANSCRIPT_CLASSIFIER está activo) y cualquier
      // modo futuro — siempre cae de vuelta a default.
      return 'default'
  }
}
