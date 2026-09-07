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

export type HookCommand = {
  type: 'command'
  command: string
  timeout?: number
  /**
   * Orden de ejecución dentro del evento. Menor corre antes.
   *
   * Adaptado de `vvv_add_hook <evento> <funcion> [prioridad]`
   * (`vvv: provision/provision-helpers.sh:533-559`), incluido su defecto de
   * **10**. El porte es ADITIVO a propósito: `runHooks` existe para que los
   * hooks que este repo ya tiene corran sin reescribirse, así que con nadie
   * declarando prioridad el orden queda idéntico al de hoy — todo en 10, y el
   * desempate es el orden de declaración.
   *
   * Lo que compra: hoy añadir un hook exige editar la configuración en el
   * sitio correcto, y no hay forma de decir «éste va después de aquél» sin
   * saber dónde está aquél. VVV lo resuelve con un número, y su orquestador
   * (`provision/provision.sh:76-117`) sólo invoca puntos con nombre — añadir
   * un provisioner no lo toca.
   */
  priority?: number
}
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
const DEFAULT_TIMEOUT_S = 60

/**
 * Prioridad por defecto — el 10 de VVV (`provision-helpers.sh:543`).
 *
 * El valor concreto importa poco; lo que importa es que sea el MISMO para
 * todos los que no la declaran, porque entonces el orden estable degenera en
 * el orden de declaración y la conducta de hoy se conserva byte a byte.
 */
const DEFAULT_PRIORITY = 10

function aplica(matcher: string | undefined, payload: Record<string, unknown>): boolean {
  if (!matcher) return true
  const objetivo = String(payload.tool_name ?? '')
  try {
    return new RegExp(`^(?:${matcher})$`).test(objetivo)
  } catch {
    return matcher === objetivo
  }
}

/**
 * Los comandos de un evento, filtrados por matcher y ORDENADOS por prioridad.
 *
 * Se separa de `runHooks` porque el orden es una decisión que se puede
 * verificar sin lanzar procesos: un test que sólo mirase el efecto de la
 * ejecución mediría el orden a través de un `bash` por hook, y confundiría
 * «ordena mal» con «un hook falló».
 *
 * El `sort` es estable por especificación (ECMAScript 2019 en adelante), que
 * es lo que hace que la prioridad sea aditiva: con todos en el defecto, el
 * resultado es la posición original. VVV consigue lo mismo agrupando por
 * prioridad y recorriendo los grupos con `sort -n`.
 */
export function orderedCommands(
  config: HookConfig,
  event: string,
  payload: Record<string, unknown>,
): HookCommand[] {
  const comandos: HookCommand[] = []
  for (const grupo of config[event] ?? []) {
    if (!aplica(grupo.matcher, payload)) continue
    for (const h of grupo.hooks) {
      if (h.type !== 'command') continue
      comandos.push(h)
    }
  }
  return comandos.sort(
    (a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY),
  )
}

/**
 * Registra un comando contra un evento, sin que el consumidor edite arreglos.
 *
 * Es `vvv_add_hook` (`provision-helpers.sh:533`): el consumidor declara su
 * punto y su número, y el orquestador sólo invoca el punto.
 *
 * Rehúsa un evento que este harness no emite. VVV valida el nombre porque lo
 * interpola en un `eval`; aquí no hay eval, pero el defecto equivalente es
 * peor y ya está declarado en la cabecera de `HARNESS_HOOK_EVENTS`: un evento
 * sin emisor es capacidad muerta — el hook se escribe, nunca corre, y su
 * silencio se lee como que no pasó nada.
 */
export function addHook(
  config: HookConfig,
  event: string,
  command: string,
  priority?: number,
  matcher?: string,
): HookConfig {
  if (!(HARNESS_HOOK_EVENTS as readonly string[]).includes(event)) {
    throw new Error(
      `evento sin emisor en este harness: ${event}. Los que se emiten: ` +
      `${HARNESS_HOOK_EVENTS.join(', ')}. Un hook registrado contra un evento ` +
      `que nadie dispara no corre nunca, y su silencio se lee como que no pasó nada.`,
    )
  }
  const entrada: HookCommand = { type: 'command', command }
  if (priority !== undefined) entrada.priority = priority
  const grupos = (config[event] ??= [])
  const existente = grupos.find((g) => g.matcher === matcher)
  if (existente) existente.hooks.push(entrada)
  else grupos.push(matcher === undefined ? { hooks: [entrada] } : { matcher, hooks: [entrada] })
  return config
}

export async function runHooks(
  config: HookConfig,
  event: string,
  payload: Record<string, unknown>,
): Promise<HookOutcome> {
  const out: HookOutcome = { ran: 0, blocked: false, additionalContext: [], errors: [] }
  const entrada = JSON.stringify({ hook_event_name: event, ...payload })
  for (const h of orderedCommands(config, event, payload)) {
    out.ran += 1
    const proc = Bun.spawn(['bash', '-lc', h.command], { stdin: Buffer.from(entrada), stdout: 'pipe', stderr: 'pipe' })
    // El corte se decide por carrera, no por `proc.killed`: ese atributo es
    // cierto también tras una salida normal. Y al vencer NO se leen las
    // tuberías: un nieto del hook (`sleep` bajo `bash -lc`) las mantiene
    // abiertas y la lectura colgaría el turno que el timeout venía a salvar.
    const ms = (h.timeout ?? DEFAULT_TIMEOUT_S) * 1000
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
  return out
}
