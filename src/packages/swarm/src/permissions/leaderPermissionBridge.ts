/**
 * El puente de permisos hacia el líder — desde código sin React.
 *
 * Procedencia: `ccnmt: packages/swarm/src/permissions/leaderPermissionBridge.ts`
 * (54 líneas, 6 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * EL PROBLEMA: un compañero en proceso (sin panel propio) pide un permiso
 * igual que cualquier otra herramienta, y esa petición tiene que resolverse
 * con el MISMO diálogo `ToolUseConfirm` que ve el líder — no con la insignia
 * de permiso de un worker con panel. El diálogo vive en el REPL (React); este
 * módulo es el puente a nivel de módulo que deja al runtime en proceso
 * (código sin React) llegar a los setters que el REPL registra al montarse.
 *
 * DOS RANURAS INDEPENDIENTES, cada una con su propio registrar/leer/olvidar:
 * la cola de confirmaciones pendientes (`ToolUseConfirmQueue`) y el contexto
 * de permiso activo (`ToolPermissionContext`). Un bug que las compartiera
 * haría que registrar una borrara la otra — la fuente ya lo prueba explícito
 * y este porte conserva esa prueba.
 *
 * DIVERGENCIA DECLARADA: `ToolUseConfirm` y `ToolPermissionContext` NO se
 * importan de `adapters/appUi.ts` — ese módulo es UI (react/ink) y queda
 * BLOQUEADO por diseño (TASK-THYROX-0006). No hace falta traerlo: la propia
 * fuente los declara como `export type ToolUseConfirm = unknown` y
 * `export type ToolPermissionContext = unknown` en ese mismo archivo — son
 * alias opacos a propósito, para no acoplar el paquete swarm a los tipos
 * reales del REPL. Este porte declara los mismos dos alias localmente, sin
 * perder nada: el tipo de la fuente ya era `unknown`.
 */

/** Alias opaco — mismo valor que `adapters/appUi.ts` (BLOCKED) declara en la fuente. */
export type ToolUseConfirm = unknown

/** Alias opaco — mismo valor que `adapters/appUi.ts` (BLOCKED) declara en la fuente. */
export type ToolPermissionContext = unknown

export type SetToolUseConfirmQueueFn = (
  updater: (prev: ToolUseConfirm[]) => ToolUseConfirm[],
) => void

export type SetToolPermissionContextFn = (
  context: ToolPermissionContext,
  options?: { preserveMode?: boolean },
) => void

let registeredSetter: SetToolUseConfirmQueueFn | null = null
let registeredPermissionContextSetter: SetToolPermissionContextFn | null = null

export function registerLeaderToolUseConfirmQueue(
  setter: SetToolUseConfirmQueueFn,
): void {
  registeredSetter = setter
}

export function getLeaderToolUseConfirmQueue(): SetToolUseConfirmQueueFn | null {
  return registeredSetter
}

export function unregisterLeaderToolUseConfirmQueue(): void {
  registeredSetter = null
}

export function registerLeaderSetToolPermissionContext(
  setter: SetToolPermissionContextFn,
): void {
  registeredPermissionContextSetter = setter
}

export function getLeaderSetToolPermissionContext(): SetToolPermissionContextFn | null {
  return registeredPermissionContextSetter
}

export function unregisterLeaderSetToolPermissionContext(): void {
  registeredPermissionContextSetter = null
}
