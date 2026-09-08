/**
 * El diff de git como dato: estadísticas, tramos por archivo, y el diff de un
 * solo archivo contra la base de fusión.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/gitDiff.ts` (532 líneas,
 * 11 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se **reimplementa** —mismo nombre de módulo, mismo sitio,
 * mismos nombres y firmas— y no se copia
 * (`porte-completo-no-parcial.md`, «la licencia cambia el mecanismo, nunca la
 * fidelidad»).
 *
 * Los NUEVE bloqueos que el porte parcial de este paquete declaraba para este
 * módulo —`file.js`, `git.js`, `detectRepository.js`, `execFileNoThrow.js`,
 * `cwd.js` y el paquete `diff`— estaban los nueve resueltos al medirlos. El
 * paquete `diff` sólo entra como TIPO (`import type`), así que el módulo no lo
 * carga en tiempo de ejecución.
 *
 * DIVERGENCIA DECLARADA (una): la fuente importa `StructuredPatchHunk` del
 * paquete `diff`, que en su árbol es la versión 8 y trae sus propias
 * declaraciones. En éste la versión instalada es la 7.0.0, que NO trae ninguna
 * —ni existe `@types/diff`—, así que el tipo se declara aquí.
 *
 * No es una pérdida de fidelidad: el tipo se consume SÓLO como tipo (la fuente
 * lo importa con `import type`, así que el módulo nunca carga el paquete en
 * tiempo de ejecución), y su forma no es un detalle interno de la librería sino
 * la del encabezado de un tramo unificado. Confirmada contra el parseador de la
 * propia librería, `diff/lib/patch/parse.js:79-82`, que construye esos cinco
 * campos y hace el mismo default a 1 cuando el conteo viene omitido.
 *
 * Declararlo aquí RETIRA una dependencia en vez de añadirla: el manifiesto de
 * este paquete no necesita `diff`.
 *
 * Los 11 símbolos exportados viajan con su firma, y los cinco privados
 * —`isInTransientGitState`, `fetchUntrackedFiles`, `parseRawDiffToToolUseDiff`,
 * `getDiffRef`, `generateSyntheticDiff`— también.
 */
import { access, readFile } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { getCachedRepository } from '@thyrox/storage/detectRepository.js'
import {
  execFileNoThrow,
  execFileNoThrowWithCwd,
} from '@thyrox/shell/execFileNoThrow.js'
import { isFileWithinReadSizeLimit } from '@thyrox/storage/file.js'
import {
  findGitRoot,
  getDefaultBranch,
  getGitDir,
  getIsGit,
  gitExe,
} from '@thyrox/storage/git.js'

/**
 * Un tramo de un diff unificado: dónde empieza y cuántas líneas ocupa a cada
 * lado, más las líneas en crudo con su marca (`+`, `-` o espacio).
 *
 * Estructuralmente idéntico al `StructuredPatchHunk` del paquete `diff`, y por
 * eso conserva su nombre: un consumidor que reciba uno de la librería o uno de
 * aquí no distingue, que es la propiedad que hace innecesaria la dependencia.
 */
export type StructuredPatchHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export type GitDiffStats = {
  filesCount: number
  linesAdded: number
  linesRemoved: number
}

export type PerFileStats = {
  added: number
  removed: number
  isBinary: boolean
  isUntracked?: boolean
}

export type GitDiffResult = {
  stats: GitDiffStats
  perFileStats: Map<string, PerFileStats>
  hunks: Map<string, StructuredPatchHunk[]>
}

const GIT_TIMEOUT_MS = 5000
const MAX_FILES = 50
/** 1 MB: por encima de esto el archivo se salta entero. */
const MAX_DIFF_SIZE_BYTES = 1_000_000
/** El tope con que GitHub deja de cargar automáticamente. */
const MAX_LINES_PER_FILE = 400
/** Por encima de esto se devuelven totales y NINGÚN detalle por archivo. */
const MAX_FILES_FOR_DETAILS = 500

/**
 * Estadísticas y tramos del árbol de trabajo contra HEAD. `null` si no hay
 * repositorio o si git falla.
 *
 * Durante una fusión, un rebase, un cherry-pick o un revert devuelve `null`:
 * el árbol de trabajo lleva cambios que ENTRARON, no cambios que alguien hizo
 * a propósito, y presentarlos como propios sería atribuirlos mal.
 */
export async function fetchGitDiff(): Promise<GitDiffResult | null> {
  const isGit = await getIsGit()
  if (!isGit) return null

  if (await isInTransientGitState()) {
    return null
  }

  // Sonda barata: `--shortstat` da los totales sin cargar contenido, así que
  // cuesta memoria constante sea cual sea el tamaño del diff. Sirve para
  // detectar un diff enorme ANTES de gastar en el caro.
  const { stdout: shortstatOut, code: shortstatCode } = await execFileNoThrow(
    gitExe(),
    ['--no-optional-locks', 'diff', 'HEAD', '--shortstat'],
    { timeout: GIT_TIMEOUT_MS, preserveOutputOnError: false },
  )

  if (shortstatCode === 0) {
    const quickStats = parseShortstat(shortstatOut)
    if (quickStats && quickStats.filesCount > MAX_FILES_FOR_DETAILS) {
      // Demasiados archivos: totales exactos y cero detalle, para no cargar
      // centenares de MB en memoria por un dato que nadie va a mirar.
      return {
        stats: quickStats,
        perFileStats: new Map(),
        hunks: new Map(),
      }
    }
  }

  const { stdout: numstatOut, code: numstatCode } = await execFileNoThrow(
    gitExe(),
    ['--no-optional-locks', 'diff', 'HEAD', '--numstat'],
    { timeout: GIT_TIMEOUT_MS, preserveOutputOnError: false },
  )

  if (numstatCode !== 0) return null

  const { stats, perFileStats } = parseGitNumstat(numstatOut)

  // Los archivos sin seguir entran por su NOMBRE, sin leer su contenido.
  const remainingSlots = MAX_FILES - perFileStats.size
  if (remainingSlots > 0) {
    const untrackedStats = await fetchUntrackedFiles(remainingSlots)
    if (untrackedStats) {
      stats.filesCount += untrackedStats.size
      for (const [path, fileStats] of untrackedStats) {
        perFileStats.set(path, fileStats)
      }
    }
  }

  // Sólo estadísticas: los tramos se piden aparte con `fetchGitDiffHunks()`
  // para no pagar un `git diff HEAD` completo en cada sondeo.
  return { stats, perFileStats, hunks: new Map() }
}

/**
 * Los tramos, bajo demanda. Separado de `fetchGitDiff()` justamente para que
 * el sondeo periódico no arrastre el coste del diff entero.
 */
export async function fetchGitDiffHunks(): Promise<
  Map<string, StructuredPatchHunk[]>
> {
  const isGit = await getIsGit()
  if (!isGit) return new Map()

  if (await isInTransientGitState()) {
    return new Map()
  }

  const { stdout: diffOut, code: diffCode } = await execFileNoThrow(
    gitExe(),
    ['--no-optional-locks', 'diff', 'HEAD'],
    { timeout: GIT_TIMEOUT_MS, preserveOutputOnError: false },
  )

  if (diffCode !== 0) {
    return new Map()
  }

  return parseGitDiff(diffOut)
}

export type NumstatResult = {
  stats: GitDiffStats
  perFileStats: Map<string, PerFileStats>
}

/**
 * Lee la salida de `git diff --numstat`: `<añadidas>\t<quitadas>\t<archivo>`.
 *
 * Un binario trae `-` en las dos cifras. Cuenta como archivo y aporta CERO
 * líneas — no `NaN`, que envenenaría la suma sin error visible.
 *
 * El detalle por archivo se corta en `MAX_FILES`; el TOTAL no, porque el
 * conteo es lo que el llamador usa para decidir si vale la pena seguir.
 */
export function parseGitNumstat(stdout: string): NumstatResult {
  const lines = stdout.trim().split('\n').filter(Boolean)
  let added = 0
  let removed = 0
  let validFileCount = 0
  const perFileStats = new Map<string, PerFileStats>()

  for (const line of lines) {
    const parts = line.split('\t')
    // Una línea válida trae tres campos separados por tabulador.
    if (parts.length < 3) continue

    validFileCount++
    const addStr = parts[0]
    const remStr = parts[1]
    // El nombre puede LLEVAR tabuladores: se reconstruye entero.
    const filePath = parts.slice(2).join('\t')
    const isBinary = addStr === '-' || remStr === '-'
    const fileAdded = isBinary ? 0 : parseInt(addStr ?? '0', 10) || 0
    const fileRemoved = isBinary ? 0 : parseInt(remStr ?? '0', 10) || 0

    added += fileAdded
    removed += fileRemoved

    if (perFileStats.size < MAX_FILES) {
      perFileStats.set(filePath, {
        added: fileAdded,
        removed: fileRemoved,
        isBinary,
      })
    }
  }

  return {
    stats: {
      filesCount: validFileCount,
      linesAdded: added,
      linesRemoved: removed,
    },
    perFileStats,
  }
}

/**
 * Parte un diff unificado en tramos por archivo.
 *
 * Tres topes, y los tres importan por separado:
 *
 * - `MAX_FILES`: se corta tras esa cantidad de archivos.
 * - `MAX_DIFF_SIZE_BYTES`: un archivo por encima de 1 MB se salta ENTERO —y
 *   los que vengan después se siguen leyendo, así que saltarlo no aborta.
 * - `MAX_LINES_PER_FILE`: dentro de un archivo, las líneas se cortan ahí.
 */
export function parseGitDiff(
  stdout: string,
): Map<string, StructuredPatchHunk[]> {
  const result = new Map<string, StructuredPatchHunk[]>()
  if (!stdout.trim()) return result

  const fileDiffs = stdout.split(/^diff --git /m).filter(Boolean)

  for (const fileDiff of fileDiffs) {
    if (result.size >= MAX_FILES) break

    if (fileDiff.length > MAX_DIFF_SIZE_BYTES) {
      continue
    }

    const lines = fileDiff.split('\n')

    // La primera línea trae `a/ruta b/ruta`: se toma el lado b.
    const headerMatch = lines[0]?.match(/^a\/(.+?) b\/(.+)$/)
    if (!headerMatch) continue
    const filePath = headerMatch[2] ?? headerMatch[1] ?? ''

    const fileHunks: StructuredPatchHunk[] = []
    let currentHunk: StructuredPatchHunk | null = null
    let lineCount = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? ''

      // Encabezado de tramo: @@ -viejoInicio,viejoN +nuevoInicio,nuevoN @@
      const hunkMatch = line.match(
        /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/,
      )
      if (hunkMatch) {
        if (currentHunk) {
          fileHunks.push(currentHunk)
        }
        currentHunk = {
          oldStart: parseInt(hunkMatch[1] ?? '0', 10),
          oldLines: parseInt(hunkMatch[2] ?? '1', 10),
          newStart: parseInt(hunkMatch[3] ?? '0', 10),
          newLines: parseInt(hunkMatch[4] ?? '1', 10),
          lines: [],
        }
        continue
      }

      // Metadata: marcadores de binario y encabezados de archivo.
      if (
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('new file') ||
        line.startsWith('deleted file') ||
        line.startsWith('old mode') ||
        line.startsWith('new mode') ||
        line.startsWith('Binary files')
      ) {
        continue
      }

      if (
        currentHunk &&
        (line.startsWith('+') ||
          line.startsWith('-') ||
          line.startsWith(' ') ||
          line === '')
      ) {
        if (lineCount >= MAX_LINES_PER_FILE) {
          continue
        }
        // `'' + line` fuerza una cadena PLANA. `split()` produce cadenas
        // rebanadas que referencian a la madre: retener una línea mantendría
        // viva la cadena entera de megabytes. `slice(0)` no sirve — el motor
        // puede devolver la misma referencia.
        currentHunk.lines.push('' + line)
        lineCount++
      }
    }

    // El último tramo no lo cierra ningún encabezado siguiente: sin este
    // empujón desaparecería, y sin error.
    if (currentHunk) {
      fileHunks.push(currentHunk)
    }

    if (fileHunks.length > 0) {
      result.set(filePath, fileHunks)
    }
  }

  return result
}

/**
 * ¿Hay una fusión, un rebase, un cherry-pick o un revert a medias?
 *
 * Se mira la PRESENCIA de los ficheros de referencia dentro del directorio de
 * git, no se lanza ningún proceso: cuatro `access` cuestan mucho menos que un
 * `git status`, y esto se consulta en cada sondeo.
 */
async function isInTransientGitState(): Promise<boolean> {
  const gitDir = await getGitDir(getCwd())
  if (!gitDir) return false

  const transientFiles = [
    'MERGE_HEAD',
    'REBASE_HEAD',
    'CHERRY_PICK_HEAD',
    'REVERT_HEAD',
  ]

  const results = await Promise.all(
    transientFiles.map(file =>
      access(join(gitDir, file))
        .then(() => true)
        .catch(() => false),
    ),
  )
  return results.some(Boolean)
}

/**
 * Los archivos sin seguir, por su nombre. NO se lee su contenido: aparecen
 * marcados para que quien mire sepa que faltan por añadir al índice.
 *
 * @param maxFiles cuántos como mucho.
 */
async function fetchUntrackedFiles(
  maxFiles: number,
): Promise<Map<string, PerFileStats> | null> {
  // `--exclude-standard` deja fuera lo ignorado.
  const { stdout, code } = await execFileNoThrow(
    gitExe(),
    ['--no-optional-locks', 'ls-files', '--others', '--exclude-standard'],
    { timeout: GIT_TIMEOUT_MS, preserveOutputOnError: false },
  )

  if (code !== 0 || !stdout.trim()) return null

  const untrackedPaths = stdout.trim().split('\n').filter(Boolean)
  if (untrackedPaths.length === 0) return null

  const perFileStats = new Map<string, PerFileStats>()

  for (const filePath of untrackedPaths.slice(0, maxFiles)) {
    perFileStats.set(filePath, {
      added: 0,
      removed: 0,
      isBinary: false,
      isUntracked: true,
    })
  }

  return perFileStats
}

/**
 * Lee `git diff --shortstat`, cuya forma es:
 * ` 1648 files changed, 52341 insertions(+), 8123 deletions(-)`
 *
 * Devuelve `null` cuando la salida no es un shortstat, y esa distinción pesa:
 * `null` significa «no hubo nada que leer», que no es lo mismo que «hubo cero
 * cambios». El llamador usa la diferencia para decidir si sigue midiendo.
 */
export function parseShortstat(stdout: string): GitDiffStats | null {
  const match = stdout.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/,
  )
  if (!match) return null
  return {
    filesCount: parseInt(match[1] ?? '0', 10),
    linesAdded: parseInt(match[2] ?? '0', 10),
    linesRemoved: parseInt(match[3] ?? '0', 10),
  }
}

const SINGLE_FILE_DIFF_TIMEOUT_MS = 3000

export type ToolUseDiff = {
  filename: string
  status: 'modified' | 'added'
  additions: number
  deletions: number
  changes: number
  patch: string
  /** `dueño/repo` de GitHub cuando se conoce; `null` fuera de github.com. */
  repository: string | null
}

/**
 * El diff de UN archivo contra la base de fusión con la rama por defecto —o
 * sea, la vista que daría un pull request, no sólo el último commit.
 *
 * Si la base de fusión no se puede determinar (estando ya en la rama por
 * defecto, por ejemplo) cae a `HEAD`. Un archivo sin seguir recibe un diff
 * SINTÉTICO en el que todo es añadido. `null` fuera de un repositorio.
 */
export async function fetchSingleFileGitDiff(
  absoluteFilePath: string,
): Promise<ToolUseDiff | null> {
  const gitRoot = findGitRoot(dirname(absoluteFilePath))
  if (!gitRoot) return null

  // git habla siempre con `/`, también en Windows.
  const gitPath = relative(gitRoot, absoluteFilePath).split(sep).join('/')
  const repository = getCachedRepository()

  const { code: lsFilesCode } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'ls-files', '--error-unmatch', gitPath],
    { cwd: gitRoot, timeout: SINGLE_FILE_DIFF_TIMEOUT_MS },
  )

  if (lsFilesCode === 0) {
    const diffRef = await getDiffRef(gitRoot)
    const { stdout, code } = await execFileNoThrowWithCwd(
      gitExe(),
      ['--no-optional-locks', 'diff', diffRef, '--', gitPath],
      { cwd: gitRoot, timeout: SINGLE_FILE_DIFF_TIMEOUT_MS },
    )
    if (code !== 0) return null
    if (!stdout) return null
    return {
      ...parseRawDiffToToolUseDiff(gitPath, stdout, 'modified'),
      repository,
    }
  }

  const syntheticDiff = await generateSyntheticDiff(gitPath, absoluteFilePath)
  if (!syntheticDiff) return null
  return { ...syntheticDiff, repository }
}

/**
 * Convierte un diff unificado crudo a la forma estructurada. Del parche se
 * queda SÓLO con el contenido de los tramos, desde el primer `@@`; el
 * encabezado de archivo no aporta nada a quien lo va a leer.
 *
 * `+++` y `---` se descuentan a propósito: son encabezado, no líneas.
 */
function parseRawDiffToToolUseDiff(
  filename: string,
  rawDiff: string,
  status: 'modified' | 'added',
): Omit<ToolUseDiff, 'repository'> {
  const lines = rawDiff.split('\n')
  const patchLines: string[] = []
  let inHunks = false
  let additions = 0
  let deletions = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      inHunks = true
    }
    if (inHunks) {
      patchLines.push(line)
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++
      }
    }
  }

  return {
    filename,
    status,
    additions,
    deletions,
    changes: additions + deletions,
    patch: patchLines.join('\n'),
  }
}

/**
 * Contra qué referencia diferenciar, en orden de precedencia:
 *
 * 1. `CLAUDE_CODE_BASE_REF`, que fija quien hospeda el contenedor;
 * 2. la base de fusión con la rama por defecto;
 * 3. `HEAD`, si la base de fusión no se puede calcular.
 */
async function getDiffRef(gitRoot: string): Promise<string> {
  const baseBranch =
    process.env.CLAUDE_CODE_BASE_REF || (await getDefaultBranch())
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'merge-base', 'HEAD', baseBranch],
    { cwd: gitRoot, timeout: SINGLE_FILE_DIFF_TIMEOUT_MS },
  )
  if (code === 0 && stdout.trim()) {
    return stdout.trim()
  }
  return 'HEAD'
}

/**
 * El diff de un archivo sin seguir: git no tiene con qué compararlo, así que
 * se fabrica uno en el que todas sus líneas son añadidas.
 *
 * El tope de lectura se consulta ANTES de leer: un archivo sin seguir de 500 MB
 * no se carga en memoria para descubrir después que era demasiado grande.
 */
async function generateSyntheticDiff(
  gitPath: string,
  absoluteFilePath: string,
): Promise<Omit<ToolUseDiff, 'repository'> | null> {
  try {
    if (!isFileWithinReadSizeLimit(absoluteFilePath, MAX_DIFF_SIZE_BYTES)) {
      return null
    }
    const content = await readFile(absoluteFilePath, 'utf-8')
    const lines = content.split('\n')
    // `split` deja una línea vacía al final si el archivo acaba en salto.
    if (lines.length > 0 && lines.at(-1) === '') {
      lines.pop()
    }
    const lineCount = lines.length
    const addedLines = lines.map(line => `+${line}`).join('\n')
    const patch = `@@ -0,0 +1,${lineCount} @@\n${addedLines}`
    return {
      filename: gitPath,
      status: 'added',
      additions: lineCount,
      deletions: 0,
      changes: lineCount,
      patch,
    }
  } catch {
    return null
  }
}
