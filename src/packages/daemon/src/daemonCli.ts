/**
 * CLI del daemon: inferencia del subcomando por TTY y por las formas
 * `--flag valor`/`--flag=valor`, validacion de `origin`, descripcion humana
 * del origen para `status`, parseo seguro de `--spawned-by`, el combinador
 * del banner de ayuda por feature flags, la escritura de una sola linea a
 * stdout/stderr, el filtrado de flags de depuracion con aviso de sobrantes,
 * el aviso de timeout tras instalar el servicio, y la clasificacion de
 * subcomandos en "toleran fallo de politica" vs "gateados por un feature
 * experimental".
 *
 * Puerto de `Bt`, `on`, `Lt`, `an`, `sn`, `G`, `z`, `Ce`, `jt`, `wa`, `rn`,
 * `nn` y el codigo de salida `Yr` (`chunk-92tvramn.js`, referencia 2.1.283,
 * resueltos con `bin/binary symbol`). Fuente de verdad: las filas D18 de
 * `.claude/workbench/daemon-inventory-20260929T065202/parity-map.tsv`.
 *
 * // pendiente: `cn` (tail de logs de un servicio de Windows leyendo por
 * // paginas de un almacenamiento remoto, con reintento en fallos
 * // transitorios) no se porta — la propia fila lo declara "no aplica": es
 * // un detalle de esa plataforma y la rama que lo invoca es inalcanzable
 * // en este chunk.
 * // pendiente: lo que `wa` hace ADEMAS de resolver+clasificar el
 * // subcomando (autenticacion del gateway, composicion de un cliente de
 * // limites de politica gestionada, y la EJECUCION propia de cada
 * // subcomando: `list`/`scheduled`/`remote-control`/`hub`/`install`/
 * // `start`/`restart`/`stop`/`status`/`logs`) no se porta aqui: thyrox no
 * // tiene ese subsistema de policy/gateway, y la ejecucion de cada
 * // subcomando ya vive en otros modulos de este paquete
 * // (`launchAgent.ts`, `daemonClient.ts`, `bgDaemon.ts`) que este item no
 * // toca. Lo que se porta de `wa` es su resolucion de `hub`→`status` y su
 * // clasificacion de gating (`resolveDaemonBgDispatch`).
 * // pendiente: `resolveDaemonBgDispatch` esta portado y probado, pero
 * // `main.ts` no lo usa para bloquear `list`/`status`: en el binario real
 * // `pV()` es un stub que siempre devuelve `false` (`chunk-4x2jc802.js`,
 * // resuelto con `bin/binary symbol`), asi que aplicar su gate tal cual
 * // apagaria permanentemente un comando de solo lectura que hoy funciona
 * // en thyrox. Cablearlo a la ejecucion real queda pendiente de que
 * // exista un mecanismo de feature flags equivalente al de la referencia.
 * // pendiente: `Bt` combina fragmentos de texto REALES del CLI de la
 * // referencia (`Xr`/`qr`/`Jr`/`Qr`/`Zr`/`en`/`tn`); esos literales no son
 * // simbolos de esta fila (viven en la fila
 * // `exit-code-y-ayuda-cli-del-daemon`, fuera de este item) — aqui se
 * // porta el COMBINADOR (que varia el texto segun los feature flags) y se
 * // alimenta desde `main.ts` con las secciones propias de thyrox.
 */

/** Origen posible de un daemon, ya validado — porte de `Lt`. */
export type DaemonOrigin = 'service' | 'transient' | 'foreground'

/** Forma validada de `--spawned-by` — porte de la forma que valida `sn`. */
export interface DaemonSpawnedBy {
  readonly label: string
  readonly cwd: string
  readonly pid: number
}

/**
 * Escribe una linea a stdout con un unico salto final — porte exacto de
 * `G`: `process.stdout.write(r+"\n")`.
 */
export function writeStdoutLine(line: string): void {
  process.stdout.write(`${line}\n`)
}

/**
 * Escribe una linea a stderr con un unico salto final — porte exacto de
 * `z`: `process.stderr.write(r+"\n")`.
 */
export function writeStderrLine(line: string): void {
  process.stderr.write(`${line}\n`)
}

/**
 * Valida el valor de `--origin` — porte exacto de `Lt`: acepta
 * `service`/`transient`/`foreground` tal cual, normaliza `auto` a
 * `transient`, y devuelve `undefined` para cualquier otro valor.
 */
export function validateDaemonOrigin(value: string | undefined): DaemonOrigin | undefined {
  if (value === 'service' || value === 'transient' || value === 'foreground') return value
  if (value === 'auto') return 'transient'
  return undefined
}

/** Insumo de `describeDaemonOrigin` — porte del parametro `r` de `an`. */
export interface DaemonOriginState {
  readonly origin?: string
  readonly spawnedBy?: DaemonSpawnedBy
}

/**
 * Arma la descripcion humana del origen de un daemon para `status` —
 * porte exacto de `an`: si el origen no es `transient`/`auto` se devuelve
 * tal cual (incluye `service`, `foreground` y el `"unknown"` por defecto);
 * si es `transient`/`auto` sin `spawnedBy`, describe un cliente generico;
 * con `spawnedBy`, nombra su `label`, `pid` y `cwd`.
 */
export function describeDaemonOrigin(state: DaemonOriginState): string {
  const origin = state.origin ?? 'unknown'
  if (origin !== 'transient' && origin !== 'auto') return origin
  const spawnedBy = state.spawnedBy
  if (!spawnedBy) return 'transient — started on-demand by a client'
  return `transient — started on-demand by \`${spawnedBy.label}\` (pid ${spawnedBy.pid}) in ${spawnedBy.cwd}`
}

/**
 * Parsea JSON sin lanzar — sustituto local de `ct(r,!1)` (helper de parseo
 * seguro de la referencia, fuera de este chunk): `undefined` en vez de
 * `null` para que el llamador no tenga que distinguir los dos.
 */
function parseJsonSafely(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Parsea de forma segura el valor de `--spawned-by` y valida su forma
 * `{label:string, cwd:string, pid:number}` — porte exacto de `sn`.
 * Devuelve `undefined` si el JSON no parsea, no es un objeto, o no calza
 * con la forma exacta.
 */
export function parseSpawnedBy(raw: string): DaemonSpawnedBy | undefined {
  const parsed = parseJsonSafely(raw)
  if (parsed === null || typeof parsed !== 'object') return undefined
  const candidate = parsed as Record<string, unknown>
  if (
    typeof candidate.label === 'string' &&
    typeof candidate.cwd === 'string' &&
    typeof candidate.pid === 'number'
  ) {
    return { label: candidate.label, cwd: candidate.cwd, pid: candidate.pid }
  }
  return undefined
}

const KNOWN_DEBUG_FLAG_LITERALS = new Set(['--debug', '-d', '--debug-to-stderr', '-d2e'])
const KNOWN_DEBUG_FLAG_PREFIXES = ['--debug=', '--debug-file=']

function isKnownDebugFlagToken(token: string): boolean {
  if (KNOWN_DEBUG_FLAG_LITERALS.has(token)) return true
  return KNOWN_DEBUG_FLAG_PREFIXES.some(prefix => token.startsWith(prefix))
}

/**
 * Filtra de `args` las flags de depuracion conocidas y las que el
 * subcomando ya reconoce (`recognizedFlags`), y avisa por stderr si sobra
 * algo — porte exacto de `Ce`: `--debug-file <valor>` consume tambien el
 * token siguiente.
 */
export function warnOnUnknownArgs(args: readonly string[], recognizedFlags: readonly string[]): void {
  const unrecognized: string[] = []
  for (let index = 0; index < args.length; index++) {
    const token = args[index]!
    if (recognizedFlags.includes(token)) continue
    if (isKnownDebugFlagToken(token)) continue
    if (token === '--debug-file' && index + 1 < args.length) {
      index++
      continue
    }
    unrecognized.push(token)
  }
  if (unrecognized.length > 0) {
    writeStderrLine(`warning: extra arguments ignored: ${unrecognized.join(' ')}`)
  }
}

/**
 * Timeout de reachability tras instalar/(re)iniciar el servicio — `QF`
 * (`chunk-m5drh1xg.js`, referencia 2.1.283, resuelto con `bin/binary
 * symbol`).
 */
export const SERVICE_REACHABILITY_TIMEOUT_MS = 45_000

/**
 * Arma el aviso de que el service manager acepto la accion (`install`,
 * `start` o `restart`) pero el daemon instalado sigue inalcanzable tras el
 * timeout — porte exacto de `jt`.
 */
export function formatServiceUnreachableAfterInstallWarning(action: string, timeoutMs: number): string {
  const timeoutSeconds = timeoutMs / 1000
  return (
    `warning: the service manager accepted the ${action}, but the installed daemon is not reachable ` +
    `after ${timeoutSeconds}s — the first start after an update can be slow. Check ` +
    '`claude daemon status` and `claude daemon logs`; if the service file points at a binary or ' +
    'launcher that no longer exists, `claude daemon install` rewrites it from the current settings.'
  )
}

/** Fragmentos de texto que combina el banner de ayuda — insumo de `Bt`. */
export interface DaemonHelpSections {
  readonly base: string
  readonly serviceInstallSection: string
  readonly serviceInstallDisabledNotice: string
  readonly remoteControlSection: string
  readonly optionsSection: string
}

/**
 * Feature flags que deciden que fragmentos entran en el banner — porte de
 * `nDe()` (`serviceInstallEnabled`), `pV()` (`remoteControlAvailable`) y
 * `s7e("remoteControl")` (`remoteControlFeatureEnabled`).
 */
export interface DaemonHelpFlags {
  readonly serviceInstallEnabled: boolean
  readonly remoteControlAvailable: boolean
  readonly remoteControlFeatureEnabled: boolean
}

/**
 * Construye el texto de ayuda de `daemon bg --help` combinando fragmentos
 * segun los feature flags — porte exacto de `Bt`:
 * `Xr+(nDe()?qr:Jr)+(pV()?Zr:s7e("remoteControl")?en:"")+tn`.
 */
export function buildDaemonHelpBanner(sections: DaemonHelpSections, flags: DaemonHelpFlags): string {
  const serviceFragment = flags.serviceInstallEnabled
    ? sections.serviceInstallSection
    : sections.serviceInstallDisabledNotice
  const remoteControlFragment = flags.remoteControlAvailable
    ? ''
    : flags.remoteControlFeatureEnabled
      ? sections.remoteControlSection
      : ''
  return sections.base + serviceFragment + remoteControlFragment + sections.optionsSection
}

/** Resultado de resolver una invocacion de `daemon bg` — porte de la forma que devuelve `on`. */
export interface DaemonBgInvocation {
  readonly sub: string
  readonly jsonPath: string
  readonly logPath: string
  readonly origin: DaemonOrigin | undefined
  readonly spawnedBy: DaemonSpawnedBy | undefined
  readonly rest: readonly string[]
}

/** Defaults que `on` toma de `YA()`/`N7()` y de `process.stdin.isTTY`. */
export interface DaemonBgInvocationDefaults {
  readonly jsonPath: string
  readonly logPath: string
  readonly isStdinTty: boolean
}

const KNOWN_DAEMON_BG_SUBCOMMANDS = new Set([
  'run',
  'install',
  'uninstall',
  'start',
  'stop',
  'restart',
  'status',
  'logs',
  'log',
  'list',
  'scheduled',
  'remote-control',
  'hub',
])

const PATH_LIKE_TOKEN = /[./\\~]/

/**
 * Resuelve argv de `daemon bg`: extrae `--json-path`, `--log-file`,
 * `--origin` (validado con `validateDaemonOrigin`) y `--spawned-by`
 * (parseado con `parseSpawnedBy`), en sus formas `--flag valor` y
 * `--flag=valor`; infiere el subcomando por defecto segun TTY
 * (`hub` interactivo, `run` si no); y localiza el primer token posicional
 * como subcomando, con dos casos de borde ademas del conocido: un token
 * desconocido sin pinta de ruta se toma como subcomando literal (forward
 * compat), y uno con pinta de ruta se interpreta como `run` con esa ruta
 * de `jsonPath` legado. Porte exacto de `on`.
 */
export function resolveDaemonBgInvocation(
  args: readonly string[],
  defaults: DaemonBgInvocationDefaults,
): DaemonBgInvocation {
  let jsonPath = defaults.jsonPath
  let logPath = defaults.logPath
  let jsonPathExplicit = false
  let origin: DaemonOrigin | undefined
  let spawnedBy: DaemonSpawnedBy | undefined
  const consumedIndices = new Set<number>()

  for (let index = 0; index < args.length; index++) {
    const token = args[index]!
    if (token === '--json-path' && args[index + 1] !== undefined) {
      consumedIndices.add(index)
      index++
      consumedIndices.add(index)
      jsonPath = args[index]!
      jsonPathExplicit = true
    } else if (token.startsWith('--json-path=')) {
      consumedIndices.add(index)
      jsonPath = token.slice('--json-path='.length)
      jsonPathExplicit = true
    } else if (token === '--log-file' && args[index + 1] !== undefined) {
      consumedIndices.add(index)
      index++
      consumedIndices.add(index)
      logPath = args[index]!
    } else if (token.startsWith('--log-file=')) {
      consumedIndices.add(index)
      logPath = token.slice('--log-file='.length)
    } else if (token === '--origin' && args[index + 1] !== undefined) {
      consumedIndices.add(index)
      index++
      consumedIndices.add(index)
      origin = validateDaemonOrigin(args[index])
    } else if (token.startsWith('--origin=')) {
      consumedIndices.add(index)
      origin = validateDaemonOrigin(token.slice('--origin='.length))
    } else if (token === '--spawned-by' && args[index + 1] !== undefined) {
      consumedIndices.add(index)
      index++
      consumedIndices.add(index)
      spawnedBy = parseSpawnedBy(args[index]!)
    }
  }

  const remaining: string[] = []
  for (let index = 0; index < args.length; index++) {
    if (!consumedIndices.has(index)) remaining.push(args[index]!)
  }

  const defaultSub = defaults.isStdinTty ? 'hub' : 'run'
  const firstPositionalIndex = remaining.findIndex(token => !token.startsWith('-'))
  if (firstPositionalIndex === -1) {
    return { sub: defaultSub, jsonPath, logPath, origin, spawnedBy, rest: remaining }
  }

  const candidateSub = remaining[firstPositionalIndex]!
  if (!KNOWN_DAEMON_BG_SUBCOMMANDS.has(candidateSub)) {
    if (!PATH_LIKE_TOKEN.test(candidateSub)) {
      return { sub: candidateSub, jsonPath, logPath, origin, spawnedBy, rest: [] }
    }
    return {
      sub: 'run',
      jsonPath: jsonPathExplicit ? jsonPath : candidateSub,
      logPath,
      origin,
      spawnedBy,
      rest: [],
    }
  }

  const restWithoutSub = [
    ...remaining.slice(0, firstPositionalIndex),
    ...remaining.slice(firstPositionalIndex + 1),
  ]
  if (candidateSub === 'run' && !jsonPathExplicit) {
    const legacyJsonPath = restWithoutSub.find(token => !token.startsWith('-'))
    if (legacyJsonPath !== undefined) jsonPath = legacyJsonPath
  }
  return { sub: candidateSub, jsonPath, logPath, origin, spawnedBy, rest: restWithoutSub }
}

/**
 * Subcomandos gateados por un feature experimental — porte exacto de `rn`.
 * Cada uno exige su gate abierto antes de ejecutarse: `remote-control` por
 * su propio flag, los demas por el flag experimental generico (`pV()`).
 */
export const EXPERIMENTAL_FEATURE_GATED_SUBCOMMANDS = new Set(['list', 'scheduled', 'remote-control', 'hub'])

/**
 * Subcomandos que TOLERAN un fallo del helper de politica (siguen
 * ejecutandose con un aviso) en vez de rehusarse — porte exacto de `nn`.
 */
export const POLICY_FAILURE_TOLERANT_SUBCOMMANDS = new Set(['run', 'status', 'stop', 'uninstall'])

/** Como esta gateado un subcomando — porte de la clasificacion que hace `wa` contra `rn`. */
export type DaemonBgSubcommandGate =
  | { readonly kind: 'ungated' }
  | { readonly kind: 'gated-by-remote-control-feature' }
  | { readonly kind: 'gated-by-experimental-flag' }

/**
 * Clasifica un subcomando de `daemon bg` segun que lo gatea — porte de
 * `rn.has(k)` y de la eleccion `k==="remote-control"?...:...` dentro de
 * `wa`.
 */
export function classifyDaemonBgSubcommand(sub: string): DaemonBgSubcommandGate {
  if (!EXPERIMENTAL_FEATURE_GATED_SUBCOMMANDS.has(sub)) return { kind: 'ungated' }
  if (sub === 'remote-control') return { kind: 'gated-by-remote-control-feature' }
  return { kind: 'gated-by-experimental-flag' }
}

/** Feature flags que deciden si un subcomando gateado corre — mismo origen que `DaemonHelpFlags`. */
export interface DaemonBgDispatchFlags {
  readonly remoteControlAvailable: boolean
  readonly remoteControlFeatureEnabled: boolean
}

/** Decision del dispatcher para un subcomando ya resuelto por `resolveDaemonBgInvocation`. */
export type DaemonBgDispatchDecision =
  | { readonly action: 'run'; readonly sub: string }
  | { readonly action: 'refuse'; readonly sub: string }

/**
 * Resuelve el subcomando efectivo (`hub`→`status` cuando remote-control no
 * esta disponible en esta plataforma) y decide si su gate esta abierto —
 * porte exacto de las dos lineas de `wa`:
 * `k = o.sub==="hub"&&!pV()?"status":o.sub` y
 * `rn.has(k)&&!(k==="remote-control"?s7e("remoteControl"):pV())`.
 */
export function resolveDaemonBgDispatch(
  invocation: Pick<DaemonBgInvocation, 'sub'>,
  flags: DaemonBgDispatchFlags,
): DaemonBgDispatchDecision {
  const sub = invocation.sub === 'hub' && !flags.remoteControlAvailable ? 'status' : invocation.sub
  const gate = classifyDaemonBgSubcommand(sub)
  if (gate.kind === 'ungated') return { action: 'run', sub }
  const isGateOpen =
    gate.kind === 'gated-by-remote-control-feature' ? flags.remoteControlFeatureEnabled : flags.remoteControlAvailable
  return isGateOpen ? { action: 'run', sub } : { action: 'refuse', sub }
}

/**
 * Codigo de salida estilo sysexits.h para un fallo de arranque en modo
 * "service" — porte exacto de `Yr`.
 */
export const EXIT_CODE_SERVICE_STARTUP_FAILURE = 70
