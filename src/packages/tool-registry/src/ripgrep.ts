/**
 * ripgrep — adaptador de flags legacy de rg hacia el binario `rg` real del
 * sistema, vía subproceso.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/ripgrep.ts` (536 líneas,
 * 6 símbolos exportados: `RipgrepTimeoutError`, `ripgrepCommand`,
 * `getRipgrepStatus`, `ripGrep`, `ripGrepStream`, `countFilesRoundedRg`).
 * Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo se
 * **reimplementa** y no se copia — se citan rutas, firmas y nombres de
 * símbolo, no el texto.
 *
 * Cobertura: 6 de 6.
 *
 * DIVERGENCIA DECLARADA (mecanismo, no comportamiento visible): la fuente
 * es un adaptador hacia `ripgrep-napi` (módulo NAPI in-process). Medido:
 * `ripgrep-napi` está AUSENTE de este árbol — no aparece en ningún
 * `package.json`, no hay `node_modules/ripgrep-napi` (ya lo había medido
 * `.claude/workbench/frontera-tool-registry-simbolo/root_modules_report.txt`
 * como bloqueador de este mismo módulo). El binario `rg` del sistema SÍ
 * está presente (`/usr/bin/rg`, v14.1.0). Este puerto reimplementa los 6
 * símbolos contra ESE binario vía `node:child_process.spawn`, parseando
 * `--json`. Mismo patrón de divergencia que ya aplican
 * `@thyrox/shell/execFileNoThrow.ts` y `which.ts` para su propia ausencia
 * (execa) — sustituir el paquete faltante por el módulo nativo de Node que
 * cubre el mismo hueco.
 *
 * Tres puntos donde este puerto MEJORA sobre la fuente o corrige un
 * hallazgo propio de la sonda, ejercitados por
 * `__tests__/ripgrep.test.ts`:
 *
 *   1. `-o`/--only-matching bajo `-F` (literal): la fuente re-matchea
 *      `m.content` con `new RegExp(pattern)` incluso en modo literal, lo
 *      que falla si el patrón tiene metacaracteres de regex (`$5` con
 *      `new RegExp('$5')` no matchea nada — `$` se lee como ancla). Este
 *      puerto usa `submatches[].match.text`, el texto que el propio motor
 *      de rg extrajo — correcto tanto en modo literal como en regex real.
 *      Es forzoso además: `rg --help` confirma que "-o/--only-matching...
 *      have no effect when --json is set", así que no hay flag de rg que
 *      delegue esto — hay que post-procesar de un lado u otro.
 *   2. Cancelación real: la fuente sólo puede dejar de ESPERAR la promesa
 *      NAPI en curso (el walker sigue corriendo; el docstring de
 *      `raceTimeout` en la fuente lo declara como limitación aceptada, y
 *      además ambos llamadores le pasan SIEMPRE `[]` como
 *      `partialFallback`, así que sus `partialResults` en un timeout real
 *      están vacíos a pesar de que el docstring de `RipgrepTimeoutError`
 *      declara la intención de que lleven datos útiles). Con un
 *      subproceso real, este puerto MATA el proceso `rg` de verdad al
 *      abortar o vencer el timeout, y devuelve como `partialResults` las
 *      líneas realmente formateadas hasta ese punto.
 *   3. Anclaje de `--glob`: medido con sonda propia — el ancla de un
 *      patrón `--glob` con `/` en medio (p. ej. `!nested/**`) es el CWD
 *      del proceso `rg`, NO la ruta que se le pasa como argumento
 *      posicional. Lanzar `rg --glob '!nested/**' /abs/target` desde un
 *      cwd distinto de `/abs/target` NO excluye nada — hay que lanzar
 *      `rg` con `cwd: /abs/target` (o el directorio del archivo, si
 *      `target` es un archivo) y un argumento posicional relativo (o
 *      ninguno). Este puerto hace eso y reconstruye rutas absolutas en
 *      post-proceso (`toAbsolute`), en vez de pasar la ruta absoluta como
 *      argumento — que es lo que rompía el anclaje.
 *
 * Medido con sonda propia contra `rg --json` (persistida en
 * `.claude/workbench/portar-ripgrep-20260909T165044/`):
 *   - `--max-columns` NO trunca el campo `lines.text` en modo `--json`
 *     (confirmado también en `rg --help`) — el truncado a
 *     `[Omitted long matching line]` se hace en post-proceso propio.
 *   - El modo `--json` de contexto NO trae un sentinel nativo de "salto de
 *     grupo" (a diferencia del `--` de modo texto) — se sintetiza
 *     detectando discontinuidad en `line_number` entre eventos
 *     consecutivos DEL MISMO archivo.
 *   - `--multiline-dotall` sin `-U`/`--multiline` no tiene efecto — este
 *     puerto emite ambos flags juntos cuando `multilineDotall` está activo.
 *
 * @module
 */
import { type ChildProcess, spawn } from 'node:child_process'
import { statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join as joinPath, resolve as resolvePath } from 'node:path'
import memoize from 'lodash-es/memoize.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

/**
 * Se lanza cuando una llamada a ripgrep excede su timeout. Se preserva la
 * forma para compatibilidad con quien llama — GrepTool distingue "la
 * búsqueda venció el timeout" de "la búsqueda no encontró nada" por el
 * tipo de esta excepción.
 */
export class RipgrepTimeoutError extends Error {
  constructor(
    message: string,
    public readonly partialResults: string[],
  ) {
    super(message)
    this.name = 'RipgrepTimeoutError'
  }
}

const DEFAULT_TIMEOUT_MS = 20_000

/**
 * Config de sandbox-runtime. `@anthropic-ai/sandbox-runtime` en Linux
 * necesita lanzar `rg` como binario EXTERNO para el enforcement de rutas
 * denegadas del filesystem — devolver esta forma estática (sin resolver
 * nada dinámicamente) preserva la firma de la fuente, que también la
 * devuelve estática por la misma razón: quien realmente decide la ruta
 * concreta de sandbox es `@thyrox/shell/sandbox/sandboxRipgrepResolver.js`
 * (`getSandboxRipgrep`), un símbolo DISTINTO en otro paquete.
 */
export function ripgrepCommand(): {
  rgPath: string
  rgArgs: string[]
  argv0?: string
} {
  return { rgPath: 'rg', rgArgs: [] }
}

/**
 * Reportado por el diagnóstico "doctor". A diferencia de la fuente — que
 * hardcodea `mode: 'napi', working: true` porque con NAPI el módulo va
 * embebido en el binario y siempre está disponible — este puerto depende
 * de un binario externo, así que `working` refleja una comprobación real
 * (`Bun.which`, sin lanzar ningún subproceso).
 */
export function getRipgrepStatus(): {
  mode: 'system' | 'builtin' | 'embedded' | 'napi'
  path: string
  working: boolean | null
} {
  const rgPath = Bun.which('rg')
  return { mode: 'system', path: rgPath ?? 'rg', working: rgPath !== null }
}

// ---------------------------------------------------------------------------
// Parseo de argumentos — traduce arrays de flags legacy de rg a opciones
// tipadas. Sólo tabla de switch; sin sorpresas. Flags desconocidas se
// ignoran en vez de rechazarse, para que agregar flags nuevas en el futuro
// no rompa a quien llama.
// ---------------------------------------------------------------------------

interface ParsedArgs {
  /** true cuando el llamador pasó --files (listado de archivos, sin patrón). */
  filesOnly: boolean
  /** Patrón (sólo relevante cuando filesOnly es false). */
  pattern: string | null
  /** Patrones `--glob` de rg, pasados verbatim (sin reescritura propia). */
  globs: string[]
  fileTypes: string[]
  hidden: boolean
  noIgnore: boolean
  follow: boolean
  maxDepth: number | null
  caseInsensitive: boolean
  literal: boolean
  multilineDotall: boolean
  maxColumns: number | null
  maxCountPerFile: number | null
  /** `-B`: líneas de contexto anteriores. null = ninguna. */
  beforeContext: number | null
  /** `-A`: líneas de contexto posteriores. null = ninguna. */
  afterContext: number | null
  /** true para `-l` (sólo archivos con coincidencia). */
  filesWithMatchesOnly: boolean
  /** true para `-c` (conteo) — el llamador espera líneas `path:count`. */
  countOnly: boolean
  /** true para `-n` (números de línea en la salida). Inerte: como en la
   * fuente, se parsea pero ningún camino posterior lo consulta — el modo
   * de contenido por defecto ya incluye el número de línea siempre. */
  lineNumbers: boolean
  /** true para `-o` / `--only-matching`: emitir sólo cada coincidencia. */
  onlyMatching: boolean
  /** Ordenar por mtime descendente. */
  sortModified: boolean
}

function parseArgs(args: string[]): ParsedArgs {
  const out: ParsedArgs = {
    filesOnly: false,
    pattern: null,
    globs: [],
    fileTypes: [],
    hidden: false,
    noIgnore: false,
    follow: false,
    maxDepth: null,
    caseInsensitive: false,
    literal: false,
    multilineDotall: false,
    maxColumns: null,
    maxCountPerFile: null,
    beforeContext: null,
    afterContext: null,
    filesWithMatchesOnly: false,
    countOnly: false,
    lineNumbers: false,
    onlyMatching: false,
    sortModified: false,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    switch (a) {
      case '--files':
        out.filesOnly = true
        break
      case '--hidden':
        out.hidden = true
        break
      case '--no-ignore':
      case '--no-ignore-vcs':
        out.noIgnore = true
        break
      case '--follow':
        out.follow = true
        break
      case '--multiline-dotall':
      case '-U':
        out.multilineDotall = true
        break
      case '-i':
        out.caseInsensitive = true
        break
      case '-F':
        out.literal = true
        break
      case '-l':
        out.filesWithMatchesOnly = true
        break
      case '-c':
        out.countOnly = true
        break
      case '-n':
      case '--line-number':
        out.lineNumbers = true
        break
      case '-o':
      case '--only-matching':
        out.onlyMatching = true
        break
      case '--no-heading':
        break
      case '--glob':
        if (i + 1 < args.length) out.globs.push(args[++i]!)
        break
      case '--type':
        if (i + 1 < args.length) out.fileTypes.push(args[++i]!)
        break
      case '--max-depth':
        if (i + 1 < args.length) out.maxDepth = Number.parseInt(args[++i]!, 10)
        break
      case '--max-columns':
        if (i + 1 < args.length) out.maxColumns = Number.parseInt(args[++i]!, 10)
        break
      case '-m':
        if (i + 1 < args.length) out.maxCountPerFile = Number.parseInt(args[++i]!, 10)
        break
      case '--sort':
        if (i + 1 < args.length && args[i + 1] === 'modified') out.sortModified = true
        i++
        break
      case '-e':
        if (i + 1 < args.length) out.pattern = args[++i]!
        break
      case '-A':
        if (i + 1 < args.length) out.afterContext = Number.parseInt(args[++i]!, 10)
        break
      case '-B':
        if (i + 1 < args.length) out.beforeContext = Number.parseInt(args[++i]!, 10)
        break
      case '-C':
        if (i + 1 < args.length) {
          const n = Number.parseInt(args[++i]!, 10)
          out.beforeContext = n
          out.afterContext = n
        }
        break
      default:
        if (!a.startsWith('-') && out.pattern === null && !out.filesOnly) {
          out.pattern = a
        }
        break
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Anclaje del root de búsqueda. Medido con sonda propia: el ancla de un
// patrón --glob con "/" en medio es el CWD del proceso rg, no la ruta
// posicional. Por eso `target` se traduce a un `cwd` de spawn + un
// argumento posicional relativo (o ninguno), y las rutas de salida se
// reconstruyen a absolutas en post-proceso.
// ---------------------------------------------------------------------------

function resolveSearchRoot(target: string): { cwd: string; arg: string | null } {
  const abs = resolvePath(target)
  let isDir: boolean
  try {
    isDir = statSync(abs).isDirectory()
  } catch {
    // No existe: se deja pasar tal cual para que rg reporte el error real
    // (ENOENT vía stderr/exit code) en vez de enmascararlo aquí.
    isDir = true
  }
  if (isDir) return { cwd: abs, arg: null }
  return { cwd: dirname(abs), arg: basename(abs) }
}

function toAbsolute(cwd: string, relativeOrPlain: string): string {
  return joinPath(cwd, relativeOrPlain)
}

// ---------------------------------------------------------------------------
// Registro de match interno — la forma equivalente a lo que
// `ripgrep-napi` devolvía como objeto por resultado, que este puerto
// reconstruye parseando NDJSON de `rg --json`.
// ---------------------------------------------------------------------------

interface MatchRecord {
  path: string
  lineNumber: number | undefined
  content: string
  isContext: boolean
  columnTruncated: boolean
  /** Texto de cada submatch, tal como el motor de rg lo extrajo — la base
   * de la extracción `-o`, ver la sección "MEJORA" del docstring del módulo. */
  submatchTexts: string[]
}

function stripTrailingNewline(s: string): string {
  if (s.endsWith('\r\n')) return s.slice(0, -2)
  if (s.endsWith('\n')) return s.slice(0, -1)
  return s
}

/**
 * Parsea la salida NDJSON de `rg --json` en registros de match, insertando
 * el sentinel `--` sintético entre grupos de contexto no contiguos DEL
 * MISMO archivo (el cambio de archivo nunca dispara el sentinel — rg no lo
 * usa como separador entre archivos distintos en esta forma sin heading).
 * `cwd` es el directorio con el que se lanzó rg, usado para absolutizar
 * `data.path.text` (que rg emite relativo a ese cwd).
 */
function parseRgJsonLines(
  raw: string,
  cwd: string,
  maxColumns: number | null,
  contextActive: boolean,
): MatchRecord[] {
  const out: MatchRecord[] = []
  let prevPath: string | null = null
  let prevLineNumber: number | null = null
  for (const line of raw.split('\n')) {
    if (line.length === 0) continue
    let event: {
      type: string
      data?: {
        path?: { text?: string }
        lines?: { text?: string }
        line_number?: number | null
        submatches?: Array<{ match?: { text?: string } }>
      }
    }
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type !== 'match' && event.type !== 'context') continue
    const d = event.data
    if (!d) continue
    const path = toAbsolute(cwd, d.path?.text ?? '')
    const lineNumber = d.line_number ?? undefined
    const content = stripTrailingNewline(d.lines?.text ?? '')
    const submatchTexts = (d.submatches ?? [])
      .map(s => s.match?.text ?? '')
      .filter(t => t.length > 0)

    if (
      contextActive &&
      prevPath === path &&
      prevLineNumber !== null &&
      lineNumber !== undefined &&
      lineNumber !== prevLineNumber + 1
    ) {
      out.push({
        path,
        lineNumber: undefined,
        content: '--',
        isContext: true,
        columnTruncated: false,
        submatchTexts: [],
      })
    }

    const columnTruncated = maxColumns !== null && content.length > maxColumns
    out.push({
      path,
      lineNumber,
      content,
      isContext: event.type === 'context',
      columnTruncated,
      submatchTexts,
    })

    prevPath = path
    prevLineNumber = lineNumber ?? null
  }
  return out
}

/** Aplica las cuatro ramas de post-proceso, idénticas en forma a la fuente. */
function formatMatches(matches: MatchRecord[], parsed: ParsedArgs): string[] {
  if (parsed.onlyMatching) {
    // -o emite cada submatch. Las líneas de contexto y el sentinel de
    // salto no tienen contenido emitible, igual que en rg real.
    return matches
      .filter(m => !m.isContext)
      .flatMap(m => m.submatchTexts.map(t => `${m.path}:${m.lineNumber ?? 0}:${t}`))
  }

  if (parsed.filesWithMatchesOnly) {
    const seen = new Set<string>()
    const result: string[] = []
    for (const m of matches) {
      if (m.isContext) continue
      if (!seen.has(m.path)) {
        seen.add(m.path)
        result.push(m.path)
      }
    }
    return result
  }

  if (parsed.countOnly) {
    const counts = new Map<string, number>()
    for (const m of matches) {
      if (m.isContext) continue
      counts.set(m.path, (counts.get(m.path) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([p, c]) => `${p}:${c}`)
  }

  // Modo contenido. Dos formas de línea, igual que las convenciones de rg:
  //   match:   `path:line:content`
  //   context: `path:line-content`
  // El separador ruta↔línea SIEMPRE es ":" — GrepTool relativiza partiendo
  // por el primer ":", y una ruta puede legítimamente contener "-".
  return matches.map(m => {
    if (m.isContext && m.lineNumber === undefined && m.content === '--') {
      return '--'
    }
    const body = m.columnTruncated ? '[Omitted long matching line]' : m.content
    const sep = m.isContext ? '-' : ':'
    return `${m.path}:${m.lineNumber ?? 0}${sep}${body}`
  })
}

// ---------------------------------------------------------------------------
// Ejecución del subproceso — sustituye a las llamadas NAPI de la fuente.
// ---------------------------------------------------------------------------

function pushCommonFilterFlags(
  argv: string[],
  opts: { globs: string[]; fileTypes: string[]; hidden: boolean; noIgnore: boolean },
): void {
  for (const g of opts.globs) {
    argv.push('--glob', g)
  }
  for (const t of opts.fileTypes) {
    argv.push('--type', t)
  }
  if (opts.hidden) argv.push('--hidden')
  if (opts.noIgnore) argv.push('--no-ignore')
}

/**
 * Corre `rg` en modo comprado (junta todo stdout, resuelve una sola vez).
 * Mata el proceso de verdad en abort/timeout — a diferencia de la promesa
 * NAPI de la fuente, que sigue corriendo de fondo (ver DIVERGENCIA arriba).
 */
function runRgBuffered(
  rgArgs: string[],
  cwd: string,
  signal: AbortSignal,
  timeoutMs: number,
  fallback: string[],
  formatFn: (rawStdout: string) => string[],
): Promise<string[]> {
  if (signal.aborted) return Promise.resolve(fallback)
  return new Promise<string[]>((resolve, reject) => {
    let settled = false
    let raw = ''
    let stderrRaw = ''
    let child: ChildProcess
    try {
      child = spawn('rg', rgArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch {
      resolve(fallback)
      return
    }
    child.stdout?.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrRaw += chunk.toString('utf8')
    })
    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      if (settled) return
      settled = true
      cleanup()
      child.kill()
      resolve(fallback)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      child.kill()
      // Timeout real con proceso muerto de verdad (ver DIVERGENCIA #2 en
      // el docstring del módulo): partialResults lleva lo formateado del
      // stdout recogido hasta este punto, no un array vacío fijo.
      reject(new RipgrepTimeoutError(`ripgrep call exceeded ${timeoutMs}ms`, formatFn(raw)))
    }, timeoutMs)
    child.on('error', () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(fallback)
    })
    child.on('close', code => {
      if (settled) return
      settled = true
      cleanup()
      // 0 = coincidencias encontradas, 1 = sin coincidencias (no es un
      // error). >=2 = error real (p. ej. regex mal formada) — se rechaza,
      // igual que la promesa NAPI de la fuente rechazaría.
      if (code !== null && code >= 2) {
        reject(new Error(`rg exited with code ${code}: ${stderrRaw.trim()}`))
        return
      }
      resolve(formatFn(raw))
    })
  })
}

function runFindFiles(parsed: ParsedArgs, target: string, signal: AbortSignal): Promise<string[]> {
  const root = resolveSearchRoot(target)
  const argv = ['--files']
  pushCommonFilterFlags(argv, parsed)
  if (parsed.follow) argv.push('--follow')
  if (parsed.maxDepth !== null) argv.push('--max-depth', String(parsed.maxDepth))
  if (parsed.sortModified) argv.push('--sortr', 'modified')
  if (root.arg !== null) argv.push(root.arg)
  return runRgBuffered(argv, root.cwd, signal, DEFAULT_TIMEOUT_MS, [], raw =>
    raw
      .split('\n')
      .filter(l => l.length > 0)
      .map(l => toAbsolute(root.cwd, l)),
  )
}

function runSearch(parsed: ParsedArgs, target: string, signal: AbortSignal): Promise<string[]> {
  const root = resolveSearchRoot(target)
  const argv = ['--json', '-e', parsed.pattern!]
  if (parsed.caseInsensitive) argv.push('-i')
  if (parsed.literal) argv.push('-F')
  if (parsed.multilineDotall) argv.push('-U', '--multiline-dotall')
  if (parsed.maxCountPerFile !== null) argv.push('-m', String(parsed.maxCountPerFile))
  if (parsed.beforeContext !== null) argv.push('-B', String(parsed.beforeContext))
  if (parsed.afterContext !== null) argv.push('-A', String(parsed.afterContext))
  pushCommonFilterFlags(argv, parsed)
  if (root.arg !== null) argv.push(root.arg)

  const format = (raw: string): string[] =>
    formatMatches(
      parseRgJsonLines(
        raw,
        root.cwd,
        parsed.maxColumns,
        parsed.beforeContext !== null || parsed.afterContext !== null,
      ),
      parsed,
    )

  return runRgBuffered(argv, root.cwd, signal, DEFAULT_TIMEOUT_MS, [], format)
}

/**
 * Búsqueda en streaming. `onLines` se llama con arrays de strings con
 * forma `path:line:content` a medida que llegan coincidencias. La fuente
 * nunca activa contexto (-A/-B) ni las ramas -l/-c/-o en este camino —
 * mismo alcance aquí (su `SearchContentOptions` para stream no incluye
 * esos campos).
 */
export async function ripGrepStream(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
  onLines: (lines: string[]) => void,
): Promise<void> {
  const parsed = parseArgs(args)
  if (parsed.pattern === null) {
    return
  }
  if (abortSignal.aborted) {
    return
  }

  const root = resolveSearchRoot(target)
  const argv = ['--json', '-e', parsed.pattern]
  if (parsed.caseInsensitive) argv.push('-i')
  if (parsed.literal) argv.push('-F')
  if (parsed.multilineDotall) argv.push('-U', '--multiline-dotall')
  if (parsed.maxCountPerFile !== null) argv.push('-m', String(parsed.maxCountPerFile))
  pushCommonFilterFlags(argv, parsed)
  if (root.arg !== null) argv.push(root.arg)

  return new Promise<void>(resolve => {
    let settled = false
    let buffer = ''
    let child: ChildProcess
    try {
      child = spawn('rg', argv, { cwd: root.cwd, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      resolve()
      return
    }
    const finish = () => {
      if (settled) return
      settled = true
      abortSignal.removeEventListener('abort', onAbort)
      resolve()
    }
    const onAbort = () => {
      child.kill()
      finish()
    }
    abortSignal.addEventListener('abort', onAbort, { once: true })
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      let idx = buffer.indexOf('\n')
      while (idx !== -1) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (line.length > 0) {
          const [record] = parseRgJsonLines(line, root.cwd, parsed.maxColumns, false)
          if (record && !record.isContext) {
            const body = record.columnTruncated
              ? '[Omitted long matching line]'
              : record.content
            onLines([`${record.path}:${record.lineNumber ?? 0}:${body}`])
          }
        }
        idx = buffer.indexOf('\n')
      }
    })
    child.on('error', finish)
    child.on('close', finish)
  })
}

/**
 * Conteo memoizado de archivos, redondeado a potencia de 10 para
 * telemetría. Quien llama no necesita el conteo exacto — quiere una
 * magnitud anonimizada (1, 10, 100, 1000, ...).
 */
export const countFilesRoundedRg = memoize(
  async (
    dirPath: string,
    abortSignal: AbortSignal,
    ignorePatterns: string[] = [],
  ): Promise<number | undefined> => {
    // Salta el directorio home entero: recorrerlo dispara diálogos de
    // permiso de TCC en macOS (Desktop, Downloads, Documents). Nunca se
    // quiere arrastrar al usuario por esos prompts por un contador de
    // telemetría.
    if (resolvePath(dirPath) === resolvePath(homedir())) {
      return undefined
    }
    if (abortSignal.aborted) return undefined
    try {
      const root = resolveSearchRoot(dirPath)
      const argv = ['--files', '--hidden']
      for (const p of ignorePatterns) {
        argv.push('--glob', `!${p}`)
      }
      if (root.arg !== null) argv.push(root.arg)
      const raw = await runRgBuffered(argv, root.cwd, abortSignal, DEFAULT_TIMEOUT_MS, [], r =>
        r.split('\n').filter(l => l.length > 0),
      )
      const count = raw.length
      if (count === 0) return 0
      const power = 10 ** Math.floor(Math.log10(count))
      return Math.round(count / power) * power
    } catch (e) {
      logForDebugging(`countFilesRoundedRg failed for ${dirPath}: ${e}`)
      return undefined
    }
  },
  (dirPath, _signal, ignorePatterns = []) => `${dirPath}|${ignorePatterns.join(',')}`,
)

/**
 * Llamada comprada a ripgrep. Devuelve una línea por resultado.
 *
 * Modo `--files`: cada línea es una ruta absoluta.
 * Búsqueda de contenido en `-l`: cada línea es una ruta.
 * Búsqueda de contenido en `-c`: cada línea es `path:count`.
 * Búsqueda de contenido por defecto: cada línea es `path:line:content`.
 */
export async function ripGrep(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
): Promise<string[]> {
  const parsed = parseArgs(args)

  if (parsed.filesOnly) {
    return runFindFiles(parsed, target, abortSignal)
  }
  if (parsed.pattern === null) {
    // Sin patrón y sin --files: mal formado, pero quien llama en la
    // práctica nunca cae aquí. Se devuelve vacío en vez de lanzar.
    return []
  }
  return runSearch(parsed, target, abortSignal)
}
