/**
 * El banco de trabajo como primitiva.
 *
 * Porte de `kaupamex-docs: .claude/packages/harness/src/workbench/manifest.ts`
 * a THYROX, con el contrato corregido por :ref:`h-docs-1073`.
 *
 * De donde sale la forma
 * -----------------------
 * No del binario: de los dos corpus que ya la practican. Medido:
 * `docs: .claude/eventos/` tiene 54 manifiestos con claves en español y
 * `api: scripts/workbench/` tiene 26 con claves en inglés. Como literales no
 * se solapan en ninguna; como conceptos, tres de las cinco son la misma clave
 * traducida.
 *
 * Que cambia respecto de la fuente, y por que
 * --------------------------------------------
 * 1. **Las cinco obligatorias son las del banco de api**, no las del harness.
 *    Dos razones que se acumulan. Una clave de manifiesto es un **atributo**, y
 *    `identificadores-en-ingles.md` fija que los atributos van en inglés. Y el
 *    conjunto de api **no exige lo que puede derivar**: el del harness pedía
 *    `evento` —que tiene que ser igual al nombre del directorio— y `fecha`
 *    —que tiene que derivar del ID—, o sea, pedía una copia de lo que la ruta
 *    ya dice, y su "verificación" comparaba la copia con su original.
 *
 *    La identidad y la fecha **se siguen verificando**, contra la ruta: que el
 *    ID lleve sufijo ISO básico sigue siendo un check que puede fallar.
 *
 * 2. **No hay alias en español, y su ausencia se midió.** Una primera version
 *    de este modulo traia una tabla `ALIASES` para que el gate pudiera leer
 *    tambien los 54 manifiestos en español de `docs: .claude/eventos/`. No
 *    tiene consumidor: ese corpus **no viaja** a THYROX por directiva, asi que
 *    el gate nunca lo va a ver. Era superficie construida para un caso
 *    hipotetico, y se retiro. En THYROX las claves son atributos y van en
 *    ingles, sin excepcion.
 *
 * 3. **`blind_to` admite lista además de cadena**, porque los 26 manifiestos
 *    vivos la escriben como lista. Una lista vacía cuenta como ausente, por la
 *    misma razón que una cadena vacía: un contenedor sin contenido pasa el
 *    check de presencia y no declara ninguna ceguera.
 *
 * Este modulo es MECANISMO: no lleva la cuenta de que bancos existen. Ese
 * registro es el directorio (`calibration-verified-numbers.md`, corolario de
 * la cifra que vive en codigo).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Las cinco claves obligatorias. El orden es el del reporte. */
export const REQUIRED_KEYS = [
  'question', 'instrument', 'metric', 'blind_to', 'destination',
] as const
export type RequiredKey = typeof REQUIRED_KEYS[number]

/** El nombre del archivo del manifiesto. Uno, en inglés, como todo en THYROX. */
export const MANIFEST_FILE_NAME = 'manifest.json'

export type WorkbenchManifest = Record<string, unknown>

/** Un problema del banco. `key` sólo cuando el defecto es de una clave. */
export type WorkbenchProblem = { key?: string; problem: string }

const BASIC_ISO = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/

/**
 * La fecha extendida que el identificador declara, o `null` si no lleva sufijo
 * ISO básico.
 *
 * Derivarla del ID —en vez de tomarla con `date -u`— es lo que hace que
 * re-correr un generador reproduzca su corpus byte a byte: con `date(1)`, cada
 * ejecución re-fecha los N archivos y el diff de ruido oculta el cambio real.
 *
 * Un directorio sin sufijo devuelve `null`, no una fecha fabricada: los que
 * existen sin él son reales y no se renombran, porque un renombre rompe las
 * citas que ya apuntan a ellos.
 */
export function runIdDate(runId: string): string | null {
  const m = BASIC_ISO.exec(runId)
  if (!m) return null
  const [, year, month, day, hour, minute, second] = m
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

/** El valor declarado para una clave. */
function declaredValue(manifest: WorkbenchManifest, key: RequiredKey): unknown {
  return manifest[key]
}

/**
 * Si un valor declara algo. Una cadena en blanco y una lista vacía no: las dos
 * pasan un check de presencia sin decir nada, que es el defecto de H-DOCS-1036.
 */
function declaresSomething(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some((item) => declaresSomething(item))
  return false
}

/**
 * Extensiones que hacen que un token se lea como archivo. Fuera de esta lista
 * el token es prosa o un comando, y no hay nada que resolver contra el disco.
 */
const FILE_EXTENSIONS = ['.py', '.sh', '.ts', '.js', '.mjs', '.sql', '.json']

/** El primer token de una pieza: lo que va antes de su glosa tras el guion largo. */
function firstToken(piece: string): string {
  return piece.split(/\s+[—-]\s+/)[0]!.trim()
}

/**
 * Si un archivo declarado está en el banco, por cualquiera de las dos formas
 * que el corpus usa para nombrarlo: relativa **al banco** (`measure.py`, 15 de
 * los 26) o relativa **a la raíz del repo**
 * (`scripts/workbench/<id>/measure.py`, 2 de los 26). Las dos nombran el mismo
 * archivo; la segunda sólo lo hace desde más lejos.
 *
 * Resolver por el último segmento no afloja el check donde importa: un nombre
 * mal escrito sigue sin existir y se sigue nombrando.
 */
function resolvesInWorkbench(dir: string, name: string): boolean {
  return existsSync(join(dir, name)) || existsSync(join(dir, basename(name)))
}

/**
 * Los archivos que el instrumento declara y no están en el banco.
 *
 * **Sólo se verifica lo que parece un archivo**, y el corte está medido: de los
 * 26 bancos vivos de `api: scripts/workbench/`, **15 declaran un archivo dentro
 * del banco y 11 declaran un comando** (`uv run pytest -n 4 --reuse-db`). Un
 * check que exigiera archivo rechazaría al 42 % del corpus que dice gobernar —
 * el mismo defecto que :ref:`h-docs-1073` midió en el gate del harness, con
 * otro eje.
 *
 * El corte deja el check capaz de fallar donde importa: un nombre de archivo
 * mal escrito no existe y se nombra; un comando no se toca. Lo que el check NO
 * puede ver es si el comando declarado corre — eso vive en `reproducible`, y
 * verificarlo exigiría ejecutarlo.
 */
function missingInstrumentFiles(dir: string, declared: unknown): string[] {
  const pieces = Array.isArray(declared) ? declared : [declared]
  const named: string[] = []
  for (const piece of pieces) {
    if (typeof piece !== 'string') continue
    const token = firstToken(piece)
    if (!FILE_EXTENSIONS.some((ext) => token.endsWith(ext))) continue
    named.push(token)
  }
  // Basta con que UNA pieza resuelva: una lista puede mezclar el guion que mide
  // con el comando que lo corre, y exigir las dos rechazaría esa forma.
  if (named.length === 0) return []
  if (named.some((name) => resolvesInWorkbench(dir, name))) return []
  return named
}

/** La ruta del manifiesto, o `null` si no está. */
function manifestPath(dir: string): string | null {
  const candidate = join(dir, MANIFEST_FILE_NAME)
  return existsSync(candidate) ? candidate : null
}

/**
 * Los problemas de un banco de trabajo. Lista vacía = conforme.
 *
 * No lanza: un gate que aborta al primer defecto obliga a N pasadas para ver N
 * problemas, y quien lo corre quiere la lista entera de una vez.
 */
export function checkWorkbench(dir: string): WorkbenchProblem[] {
  const path = manifestPath(dir)
  if (path === null) {
    return [{ problem: `falta ${MANIFEST_FILE_NAME} en ${dir}` }]
  }
  let manifest: WorkbenchManifest
  try {
    manifest = JSON.parse(readFileSync(path, 'utf8')) as WorkbenchManifest
  } catch (err) {
    return [{ problem: `${basename(path)} no parsea: ${(err as Error).message}` }]
  }

  const problems: WorkbenchProblem[] = []
  for (const key of REQUIRED_KEYS) {
    if (!declaresSomething(declaredValue(manifest, key))) {
      problems.push({ key, problem: `${key}: ausente o vacía` })
    }
  }
  if (problems.length > 0) return problems

  // La identidad y la fecha se verifican contra la RUTA, que es su fuente, en
  // vez de contra una copia que el autor teclea (h-docs-1073).
  const id = basename(dir)
  if (runIdDate(id) === null) {
    problems.push({
      problem: `el identificador '${id}' no lleva sufijo ISO básico; su fecha no se puede verificar`,
    })
  }

  const declared = declaredValue(manifest, 'instrument')
  const missing = missingInstrumentFiles(dir, declared)
  for (const name of missing) {
    problems.push({ key: 'instrument', problem: `el instrumento '${name}' no existe en el banco` })
  }

  return problems
}

const twoDigits = (n: number) => String(n).padStart(2, '0')

/** El ISO **básico** del identificador: sin separadores, porque el slug ya usa guiones. */
export function runIdFor(slug: string, now: Date): string {
  if (BASIC_ISO.test(slug)) {
    throw new Error(`el slug '${slug}' ya trae sufijo ISO: acuñaría dos`)
  }
  const date = `${now.getUTCFullYear()}${twoDigits(now.getUTCMonth() + 1)}${twoDigits(now.getUTCDate())}`
  const time = `${twoDigits(now.getUTCHours())}${twoDigits(now.getUTCMinutes())}${twoDigits(now.getUTCSeconds())}`
  return `${slug}-${date}T${time}`
}

/**
 * Crea el banco y devuelve su ruta.
 *
 * **Omite las cinco claves a propósito.** Son las que el andamiaje no puede
 * saber, y omitir es distinto de rellenar: un placeholder pasa el check de
 * presencia y se lee como dato —H-DOCS-1036, un `TIMESTAMP_PLACEHOLDER` que
 * llegó al disco—, mientras que una clave ausente la nombra el gate.
 *
 * Un banco recién andamiado **NO es conforme**, y ese es el estado correcto:
 * no está hecho hasta que tiene instrumento y declara qué mide y qué no ve.
 */
export function scaffoldWorkbench(baseDir: string, slug: string, now: Date = new Date()): string {
  const id = runIdFor(slug, now)
  const dir = join(baseDir, id)
  mkdirSync(dir, { recursive: true })
  for (const sub of ['tests', 'outputs', 'probes']) mkdirSync(join(dir, sub), { recursive: true })

  writeFileSync(join(dir, MANIFEST_FILE_NAME), `${JSON.stringify({}, null, 2)}\n`)

  writeFileSync(join(dir, 'README.md'), [
    `# ${slug}`, '',
    '## El encargo', '', '<!-- verbatim, sin parafrasear -->', '',
    '## La premisa, si se corrigió al primer comando', '',
    '## Las piezas', '', '| archivo | qué hace |', '|---|---|', '',
    '## Los resultados', '',
    '*Métrica:*', '*Ciega a:*', '',
  ].join('\n'))
  return dir
}
