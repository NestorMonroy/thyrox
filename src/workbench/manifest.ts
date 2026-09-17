/**
 * El workbench como primitiva, y cada una de sus ejecuciones fechadas un run.
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
 *
 * El lexico, y por que este archivo habla dos
 * -------------------------------------------
 * La prosa nacio diciendo «banco», calco de «banco de trabajo». El termino no
 * es viable: en espanol `banco` nombra a la vez la institucion financiera, el
 * asiento, el cardumen y el banco de pruebas, y su traduccion literal al
 * ingles —`bank`— designa el sentido equivocado. El dominio ya tiene sus dos
 * palabras y las lleva el codigo de este mismo archivo:
 *
 * - **workbench** — el subsistema y la forma. `WORKBENCH_FORMS`,
 *   `checkWorkbench`, `scaffoldWorkbench`, `.claude/workbench/`.
 * - **run** — UNA ejecucion fechada, `<slug>-<ISO>`. `runIdFor`, `runsFor`,
 *   `latestRun`, `runIdDate`.
 *
 * Corregido aqui lo que este modulo PRODUCE —la definicion de la primitiva, el
 * andamiaje, el resolutor y el texto que emite el gate— porque un productor
 * que habla mal ensucia todo lo que emite. La prosa descriptiva que queda con
 * «banco» describe el corpus de `api` y es deuda heredada: se barre con los
 * identificadores en espanol, no en un pase aparte.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Las cinco claves obligatorias. El orden es el del reporte. */
export const REQUIRED_KEYS = [
  'question', 'instrument', 'metric', 'blind_to', 'destination',
] as const
export type RequiredKey = typeof REQUIRED_KEYS[number]

/** El nombre del archivo del manifiesto. Uno, en inglés, como todo en THYROX. */
export const MANIFEST_FILE_NAME = 'manifest.jsonl'

/**
 * El nombre ANTERIOR, que el lector sigue aceptando y el escritor ya no emite.
 *
 * Este módulo es del PROVEEDOR y sus consumidores tienen sus propios
 * manifiestos: renombrar la constante sin esto los vuelve ilegibles — el gate
 * diría «falta manifest.jsonl» sobre un banco conforme. Gemelo de
 * `LEGACY_MANIFEST_FILE_NAME` en `manifest.py`.
 *
 * **No lleva condición de retiro.** El consumidor ya declara DÓNDE viven sus
 * manifiestos (`THYROX_WORKBENCH_<CLONE>`, `THYROX_JOBS_<CLONE>`,
 * `THYROX_CACHE_<CLONE>`) — ése es el eje de LOCALIZACIÓN, legítimamente
 * distinto por clon. El nombre del archivo es el eje de FORMATO, y no se
 * parametriza por clon: dos consumidores que discrepen sobre qué es un
 * manifiesto son la segunda fuente de verdad que este módulo prohíbe. El lector
 * es tolerante de forma permanente y ningún consumidor convierte nada.
 * Ver TASK-THYROX-0067.
 */
export const LEGACY_MANIFEST_FILE_NAME = 'manifest.json'

/**
 * La clave que clasifica cada registro. Una cabecera POR POSICIÓN repetiría el
 * defecto de H-THYROX-37 un nivel más abajo: clasificar por el sitio en vez de
 * por el contenido. Etiquetado, un registro sobrevive a la concatenación y al
 * reordenamiento.
 */
export const KIND_KEY = 'kind'

/**
 * Funde los registros de un JSONL en el documento que el lector consume.
 *
 * **El gemelo de `read_manifest_lines` de `manifest.py`**, y la misma
 * precedencia declarada: **orden de archivo, el registro POSTERIOR gana**. Es
 * la semántica de un append — la última escritura manda, que es lo que la
 * reescritura anterior hacía.
 *
 * Una línea en blanco no es un registro: un run recién andamiado no tiene
 * ninguno, y eso no es un error.
 */
export function readManifestLines(raw: string): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const record = JSON.parse(trimmed) as Record<string, unknown>
    delete record[KIND_KEY]
    Object.assign(merged, record)
  }
  return merged
}

/** Un registro etiquetado, serializado en UNA línea — sin sangrado. */
export function manifestLine(kind: string, payload: Record<string, unknown>): string {
  return JSON.stringify({ [KIND_KEY]: kind, ...payload })
}

/**
 * Las tres formas del banco, con sus valores en INGLÉS.
 *
 * Portadas del puerto que vivía en el paquete `harness` —`corpus`, `medicion`,
 * `transformacion`—. `identificadores-en-ingles.md` cubre las claves de
 * manifiesto («una clave es un atributo») y el mismo criterio alcanza a los
 * valores de una clave cerrada: son vocabulario del contrato, no prosa.
 *
 * Traducir no es rebautizar: `corpus` ya estaba en inglés y no se toca.
 *
 * Directiva del ejecutor 2026-09-06: lo que otros consumidores tengan escrito
 * en español es asunto suyo y no condiciona si esto puede ejecutarse; lo
 * nuestro va en inglés.
 */
export const WORKBENCH_FORMS = ['corpus', 'measurement', 'transformation'] as const
export type WorkbenchForm = typeof WORKBENCH_FORMS[number]

/**
 * Las piezas que cada forma exige. `corpus` no exige ninguna: su valor es el
 * material, no un procedimiento.
 */
const PIECES_BY_FORM: Record<WorkbenchForm, string[]> = {
  corpus: [],
  measurement: ['tests/', 'outputs/'],
  transformation: ['radius/'],
}

export type WorkbenchManifest = Record<string, unknown>

/** Un problema del banco. `key` sólo cuando el defecto es de una clave. */
export type WorkbenchProblem = { key?: string; problem: string }

const BASIC_ISO = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/

/** El mismo ISO, anclado por los dos extremos: el resto del nombre tras el
 *  prefijo tiene que ser EXACTAMENTE el sufijo, o `a-b-<ISO>` se listaria
 *  bajo el slug `a` — un run ajeno devuelto como propio. */
const EXACT_BASIC_ISO = /^\d{8}T\d{6}$/

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

/**
 * La ruta del manifiesto, o `null` si no está.
 *
 * Prueba el JSONL y DESPUÉS el heredado, en ese orden: durante la ventana en
 * que un run lleva los dos, manda el nuevo. Devuelve `null` en vez de componer
 * la ruta que tendría — un consumidor con una ruta inexistente seguiría en
 * verde apuntando al vacío.
 */
function manifestPath(dir: string): string | null {
  for (const name of [MANIFEST_FILE_NAME, LEGACY_MANIFEST_FILE_NAME]) {
    const candidate = join(dir, name)
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * El documento de un archivo de manifiesto, despachando por SUFIJO.
 *
 * Un `.json` declara un documento entero; un `.jsonl`, líneas. Probar primero
 * como JSONL y caer al documento entero reintroduciría la trampa n=1 que la
 * conversión existe para evitar: `JSON.parse` acepta un JSONL de una sola
 * línea, así que el lector de líneas nunca se probaría como tal. Y el `.json`
 * de un consumidor viene impreso en VARIAS líneas, con lo que el lector de
 * líneas revienta con él. Gemelo de `read_manifest_file` en `manifest.py`.
 */
export function readManifestFile(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf8')
  if (basename(path) === LEGACY_MANIFEST_FILE_NAME) {
    return raw.trim() === '' ? {} : (JSON.parse(raw) as Record<string, unknown>)
  }
  return readManifestLines(raw)
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
    manifest = readManifestFile(path) as WorkbenchManifest
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
    problems.push({ key: 'instrument', problem: `el instrumento '${name}' no existe en el run` })
  }

  const declaredForm = manifest.form
  if (declaredForm !== undefined) {
    const form = declaredForm as WorkbenchForm
    if (!WORKBENCH_FORMS.includes(form)) {
      problems.push({
        key: 'form',
        problem: `form '${String(declaredForm)}' no es una de ${WORKBENCH_FORMS.join(' · ')}`,
      })
    } else {
      for (const piece of PIECES_BY_FORM[form]) {
        if (!existsSync(join(dir, piece.replace(/\/$/, '')))) {
          problems.push({ problem: `${piece} lo exige la forma '${form}'` })
        }
      }
    }
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
 * Los runs de un slug bajo un hogar dado, del más reciente al más antiguo.
 *
 * Existe porque el subsistema sabía **acuñar** un identificador y no
 * **encontrarlo**. Sin resolutor, quien crea un run tiene que llevarse el
 * ISO a alguna parte, y esa parte acaba siendo un archivo efímero fuera del
 * árbol — medido en esta sesión: un puntero en `/dev/shm`, que ninguna otra
 * sesión puede leer y que el contenedor borra. El defecto no era el puntero,
 * era que el mecanismo no ofrecía alternativa.
 *
 * El orden es por NOMBRE, no por `mtime`: el ISO va en el identificador, así
 * que el orden lexicográfico ES el cronológico, y no depende de que nadie haya
 * tocado el directorio después. Un `mtime` cambia al escribir un output y
 * reordenaría runs por actividad en vez de por creación.
 *
 * Ciega a: un run cuyo directorio no siga la forma `<slug>-<ISO básico>` —
 * no se lista, aunque exista. Es deliberado: el resolutor no adivina qué
 * quiso decir un nombre a mano.
 */
export function runsFor(baseDir: string, slug: string): string[] {
  if (!existsSync(baseDir)) return []
  const prefix = `${slug}-`
  return readdirSync(baseDir)
    .filter((name) => name.startsWith(prefix) && EXACT_BASIC_ISO.test(name.slice(prefix.length)))
    .sort()
    .reverse()
    .map((name) => join(baseDir, name))
}

/**
 * El run más reciente de un slug, o `null`.
 *
 * Devuelve `null` en vez de inventar la ruta que tendría: un consumidor que
 * recibiera una ruta inexistente seguiría en verde apuntando al vacío, que es
 * la conducta que `thyroxRoot` rehúsa por la misma razón.
 */
export function latestRun(baseDir: string, slug: string): string | null {
  return runsFor(baseDir, slug)[0] ?? null
}

/**
 * Crea el run y devuelve su ruta.
 *
 * **Omite las cinco claves a propósito.** Son las que el andamiaje no puede
 * saber, y omitir es distinto de rellenar: un placeholder pasa el check de
 * presencia y se lee como dato —H-DOCS-1036, un `TIMESTAMP_PLACEHOLDER` que
 * llegó al disco—, mientras que una clave ausente la nombra el gate.
 *
 * Un run recién andamiado **NO es conforme**, y ese es el estado correcto:
 * no está hecho hasta que tiene instrumento y declara qué mide y qué no ve.
 */
export function scaffoldWorkbench(baseDir: string, slug: string, now: Date = new Date()): string {
  const id = runIdFor(slug, now)
  const dir = join(baseDir, id)
  mkdirSync(dir, { recursive: true })
  for (const sub of ['tests', 'outputs', 'probes']) mkdirSync(join(dir, sub), { recursive: true })

  // Cero registros, no un `{}`. En JSONL «todavía no hay nada declarado» es un
  // archivo vacío; un `{}` sería un registro sin etiqueta que el lector tendría
  // que interpretar.
  writeFileSync(join(dir, MANIFEST_FILE_NAME), '')

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
