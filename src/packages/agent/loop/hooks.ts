/**
 * Ejecutor de hooks (T-007) — con el contrato del cliente, a propósito.
 *
 * Entrada por `stdin` como JSON con `hook_event_name`, `session_id`,
 * `transcript_path` y `cwd`; salida por `stdout` como JSON con
 * `hookSpecificOutput`; **exit 2 bloquea** y su `stderr` es la razón. Copiarlo
 * es lo que permite que los hooks que este repositorio ya tiene —los del
 * store, `preModelSwitch.ts`, los gates— corran bajo nuestro harness sin
 * reescribirse.
 *
 * Un hook que falla con cualquier otro código NO bloquea: se anota su error y
 * el turno sigue. Es la misma asimetría del cliente, y existe para que un
 * guion roto no deje la sesión inservible.
 */
/**
 * Los eventos que ESTE harness emite. La lista es corta a propósito.
 *
 * El cliente declara 33 en su binario; los otros 22 no se declaran aquí porque
 * **no hay emisor** para ellos (`TeammateIdle`, `WorktreeCreate`,
 * `FileChanged`…). Declarar un evento que nadie dispara es capacidad muerta: el
 * hook se escribe, nunca corre, y su silencio se lee como que no pasó nada.
 * Cada uno entra cuando existe el subsistema que lo emite, no antes (T-017).
 */
export const HARNESS_HOOK_EVENTS = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd',
  'PreCompact', 'PostCompact', 'PreModelSwitch', 'PostModelSwitch',
  'SubagentStart', 'SubagentStop',
  // T-017: los que tienen su subsistema emisor construido. Medido contra el
  // árbol, no leído del enunciado: la puerta de permisos, la ruta de error de
  // herramienta, el lote de llamadas de un turno, las herramientas de escritura
  // y el ensamblado del prompt ya existen, y cada uno ES el punto de emisión.
  'PermissionRequest', 'PermissionDenied', 'PostToolUseFailure', 'PostToolBatch',
  'FileChanged', 'InstructionsLoaded', 'TaskCreated', 'TaskCompleted',
] as const

export type HarnessHookEvent = (typeof HARNESS_HOOK_EVENTS)[number]

export type HookCommand = { type: 'command'; command: string; timeout?: number }
export type HookMatcher = { matcher?: string; hooks: HookCommand[] }
export type HookConfig = Record<string, HookMatcher[]>

export type HookOutcome = {
  ran: number
  blocked: boolean
  reason?: string
  additionalContext: string[]
  errors: string[]
}

/**
 * Segundos por defecto antes de cortar un hook colgado.
 *
 * Porte de `DEFAULT_TIMEOUT=60000` (milisegundos) del ejecutable 2.1.258.
 * Aquí la unidad es el segundo porque el campo `timeout` del propio hook se
 * declara en segundos; la conversión ocurre en `ejecutarUno`.
 */
const TIMEOUT_POR_DEFECTO = 60

function aplica(matcher: string | undefined, payload: Record<string, unknown>): boolean {
  if (!matcher) return true
  const objetivo = String(payload.tool_name ?? '')
  try {
    return new RegExp(`^(?:${matcher})$`).test(objetivo)
  } catch {
    return matcher === objetivo
  }
}

export async function runHooks(
  config: HookConfig,
  event: string,
  payload: Record<string, unknown>,
): Promise<HookOutcome> {
  const out: HookOutcome = { ran: 0, blocked: false, additionalContext: [], errors: [] }
  const entrada = JSON.stringify({ hook_event_name: event, ...payload })
  for (const grupo of config[event] ?? []) {
    if (!aplica(grupo.matcher, payload)) continue
    for (const h of grupo.hooks) {
      if (h.type !== 'command') continue
      out.ran += 1
      const proc = Bun.spawn(['bash', '-lc', h.command], { stdin: Buffer.from(entrada), stdout: 'pipe', stderr: 'pipe' })
      // El corte se decide por carrera, no por `proc.killed`: ese atributo es
      // cierto también tras una salida normal. Y al vencer NO se leen las
      // tuberías: un nieto del hook (`sleep` bajo `bash -lc`) las mantiene
      // abiertas y la lectura colgaría el turno que el timeout venía a salvar.
      const ms = (h.timeout ?? TIMEOUT_POR_DEFECTO) * 1000
      let temporizador: ReturnType<typeof setTimeout> | undefined
      const vencido = new Promise<'timeout'>((r) => {
        temporizador = setTimeout(() => r('timeout'), ms)
      })
      const desenlace = await Promise.race([proc.exited.then((c) => ({ code: c })), vencido])
      clearTimeout(temporizador)
      if (desenlace === 'timeout') {
        proc.kill(9)
        out.errors.push(`${h.command}: timeout tras ${ms / 1000}s`)
        continue
      }
      const code = desenlace.code
      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()
      if (code === 2) {
        out.blocked = true
        out.reason = [out.reason, stderr.trim() || `${h.command}: exit 2`].filter(Boolean).join('\n')
        continue
      }
      if (code !== 0) {
        out.errors.push(`${h.command}: exit ${code} ${stderr.trim()}`)
        continue
      }
      if (!stdout.trim()) continue
      try {
        const d = JSON.parse(stdout) as { hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string; additionalContext?: string }; systemMessage?: string }
        const hso = d.hookSpecificOutput
        if (hso?.permissionDecision === 'deny') {
          out.blocked = true
          out.reason = [out.reason, hso.permissionDecisionReason ?? `${h.command}: deny`].filter(Boolean).join('\n')
        }
        if (hso?.additionalContext) out.additionalContext.push(hso.additionalContext)
        if (d.systemMessage) out.additionalContext.push(d.systemMessage)
      } catch {
        // salida que no es JSON: el cliente la muestra y sigue; aquí se ignora
      }
    }
  }
  return out
}
