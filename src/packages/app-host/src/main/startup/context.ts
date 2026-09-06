// Adaptación de @claude-code-how-works/app-host: src/main/startup/context.ts.
// Capa 1 (con cita a `../../bootstrap/cwd.js`, del mismo paquete) —
// porte PARCIAL declarado.
//
// La fuente orquesta 13 colaboradores de paquetes hermanos ausentes en
// este árbol — `@claude-code-how-works/provider` (contexto de sistema/
// usuario), `/local-observability` (diagnóstico), `/repl` (tips),
// `/tool-registry` (ripgrep, detector de cambios de skills),
// `/mcp-runtime` (prefetch de URLs MCP oficiales), `/config` (trust
// dialog, detector de cambios de settings) — más `getIsNonInteractiveSession`
// de `../../bootstrap/state.js`, que ese archivo no exporta todavía
// (medido: `grep -n NonInteractiveSession bootstrap/state.ts` → sin
// resultados).
//
// Se resuelve con inyección de dependencia total (`PrefetchDeps`), con
// defaults no-op/false que reproducen el estado real de hoy: sin esos 14
// colaboradores, ninguno de los prefetches puede ejecutarse de verdad
// todavía. El único colaborador real disponible en este paquete —
// `getCwd()` de `../../bootstrap/cwd.js` — se porta con su cita viva. El
// mecanismo — el orden de los prefetches, los gateos por env var, la
// decisión bare-mode/no-interactivo — se porta verbatim; lo que cambia
// es de dónde vienen los 14 colaboradores.
//
// `isEnvTruthy` se reimplementa localmente, verbatim de
// `ccnmt: packages/config/env/utils.ts:43-48`.

import { getCwd } from '../../bootstrap/cwd.js'

function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

export type DiagnosticsLevel = 'info' | 'warn' | 'error'

export type PrefetchDeps = {
  getIsNonInteractiveSession?: () => boolean
  logForDiagnosticsNoPII?: (level: DiagnosticsLevel, event: string) => void
  getSystemContext?: () => Promise<unknown>
  checkHasTrustDialogAccepted?: () => boolean
  isBareMode?: () => boolean
  initUser?: () => Promise<void>
  getUserContext?: () => Promise<unknown>
  getRelevantTips?: () => Promise<unknown>
  prefetchAwsCredentialsAndBedRockInfoIfSafe?: () => Promise<void>
  prefetchGcpCredentialsIfSafe?: () => Promise<void>
  countFilesRoundedRg?: (cwd: string, signal: AbortSignal, args: string[]) => Promise<void>
  prefetchOfficialMcpUrls?: () => Promise<void>
  refreshModelCapabilities?: () => Promise<void>
  initializeSettingsChangeDetector?: () => Promise<void>
  initializeSkillChangeDetector?: () => Promise<void>
  startEventLoopStallDetector?: () => void
}

const asyncNoop = async (): Promise<void> => {}

/**
 * Precarga el contexto del sistema si es seguro hacerlo: siempre en
 * sesiones no interactivas, o si el diálogo de confianza ya fue
 * aceptado. En cualquier otro caso, se omite (evita I/O antes de que el
 * usuario haya confiado explícitamente en el directorio).
 */
export function prefetchSystemContextIfSafe(deps: PrefetchDeps = {}): void {
  const log = deps.logForDiagnosticsNoPII ?? (() => {})
  const getSystemContext = deps.getSystemContext ?? (async () => undefined)
  const isNonInteractiveSession = (deps.getIsNonInteractiveSession ?? (() => false))()

  if (isNonInteractiveSession) {
    log('info', 'prefetch_system_context_non_interactive')
    void getSystemContext()
    return
  }

  if ((deps.checkHasTrustDialogAccepted ?? (() => false))()) {
    log('info', 'prefetch_system_context_has_trust')
    void getSystemContext()
    return
  }

  log('info', 'prefetch_system_context_skipped_no_trust')
}

/**
 * Dispara, en segundo plano y sin esperar, todos los prefetches que
 * pueden solaparse con el resto del arranque: contexto de usuario/sistema,
 * tips, credenciales cloud si aplica, conteo de archivos del repo,
 * catálogo MCP oficial, capacidades del modelo, y los detectores de
 * cambios de settings/skills.
 */
export function startDeferredPrefetches(deps: PrefetchDeps = {}): void {
  const isBareModeFn = deps.isBareMode ?? (() => false)
  if (isEnvTruthy(process.env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER) || isBareModeFn()) {
    return
  }

  void (deps.initUser ?? asyncNoop)()
  void (deps.getUserContext ?? (async () => undefined))()
  prefetchSystemContextIfSafe(deps)
  void (deps.getRelevantTips ?? (async () => undefined))()

  if (
    isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK) &&
    !isEnvTruthy(process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH)
  ) {
    void (deps.prefetchAwsCredentialsAndBedRockInfoIfSafe ?? asyncNoop)()
  }
  if (
    isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX) &&
    !isEnvTruthy(process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH)
  ) {
    void (deps.prefetchGcpCredentialsIfSafe ?? asyncNoop)()
  }

  void (deps.countFilesRoundedRg ?? (async () => undefined))(getCwd(), AbortSignal.timeout(3000), [])
  void (deps.prefetchOfficialMcpUrls ?? asyncNoop)()
  void (deps.refreshModelCapabilities ?? asyncNoop)()
  void (deps.initializeSettingsChangeDetector ?? asyncNoop)()

  // Nota de fidelidad: en la fuente esta segunda comprobación de bare-mode
  // es, en la práctica, siempre verdadera aquí abajo — la primera
  // comprobación (arriba) ya habría retornado si isBareMode() fuera true.
  // Se porta verbatim (misma forma que la fuente) en vez de simplificarla:
  // no es este porte el que corrige una redundancia de ccnmt.
  if (!isBareModeFn()) {
    void (deps.initializeSkillChangeDetector ?? asyncNoop)()
  }

  if (process.env.USER_TYPE === 'ant') {
    ;(deps.startEventLoopStallDetector ?? (() => {}))()
  }
}
