/**
 * El banco de trabajo como primitiva (#80, TASK-GEN-0628).
 *
 * De dónde sale la forma
 * -----------------------
 * No del binario: de `.claude/eventos/`, que ya la practica. Medido antes de
 * codificarla —45 manifiestos legibles sobre 140 directorios— las claves que
 * más se repiten son `fecha` 29, `evento` 27, `metrica` 22, `ciega_a` 21,
 * `instrumento` 18. Ésas son las cinco que el gate exige, y no por frecuencia
 * sola: tres son **mecánicamente verificables** (la identidad contra el nombre
 * del directorio, la fecha contra el ID, el instrumento contra el disco) y las
 * otras dos son las que `metrica-decide-la-conclusion.md` obliga a declarar
 * junto a cualquier cifra. Un gate cuyas cinco exigencias pueden fallar.
 *
 * Lo que NO se exige, y es deliberado: las otras once claves que aparecen en
 * los manifiestos medidos (`reproducible`, `destino`, `pregunta`, `fuente`,
 * `genera`, `id`, `generador`, `metodo`, `proposito`, `tareas_abiertas`,
 * `tema`). Son útiles y ninguna es universal; convertirlas en obligatorias
 * marcaría en rojo bancos correctos por deuda heredada, que es el defecto que
 * `artefactos-minimos-iniciativa.md` ya documentó al graduar su propio gate.
 *
 * Este módulo es MECANISMO: no lleva la cuenta de qué bancos existen. Ese
 * registro es el directorio (`calibration-verified-numbers.md`, corolario de la
 * cifra que vive en código).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

/** Las cinco claves del manifiesto. El orden es el del reporte. */
export const REQUIRED_KEYS = ['evento', 'fecha', 'instrumento', 'metrica', 'ciega_a'] as const
export type RequiredKey = typeof REQUIRED_KEYS[number]

/**
 * Las tres formas del README de `.claude/eventos/`. Las dos primeras ya
 * estaban escritas; la **transformación** es la que #89 (`TASK-DOCS-0380`)
 * añade, y su pieza distintiva es `radio/`: a quién rompe el cambio. Sin ella
 * no hay diferencia observable entre transformar y medir — es lo que
 * :ref:`h-docs-1039` registró.
 */
export const WORKBENCH_FORMS = ['corpus', 'medicion', 'transformacion'] as const
export type WorkbenchForm = typeof WORKBENCH_FORMS[number]

/** La pieza que cada forma tiene que traer, si declara `forma`. */
const PIECES_BY_FORM: Record<WorkbenchForm, string[]> = {
  corpus: [],
  medicion: ['tests/', 'salidas/'],
  transformacion: ['radio/'],
}

export type WorkbenchManifest = Record<string, unknown> & Partial<Record<RequiredKey, string>>

/** Un problema del banco. `key` sólo cuando el defecto es de una clave. */
export type WorkbenchProblem = { key?: string; problem: string }

const ISO_BASICO = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/

/**
 * La fecha extendida que el identificador declara, o `null` si no lleva sufijo
 * ISO básico. Derivarla del ID —en vez de tomarla con `date -u`— es lo que hace
 * que re-correr un generador reproduzca su corpus byte a byte: con `date(1)`,
 * cada corrida re-fecha los N archivos y el diff de ruido oculta el cambio real.
 *
 * Los 9 directorios medidos sin sufijo ISO son reales y no se renombran (un
 * renombre rompe las citas que ya apuntan a ellos), así que la respuesta
 * correcta sobre ellos es `null`, no una fecha fabricada.
 */
export function runIdDate(runId: string): string | null {
  const m = ISO_BASICO.exec(runId)
  if (!m) return null
  const [, a, mes, d, h, min, s] = m
  return `${a}-${mes}-${d}T${h}:${min}:${s}`
}

function noVacia(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Los problemas de un banco de trabajo. Lista vacía = conforme.
 *
 * No lanza: un gate que aborta al primer defecto obliga a N pasadas para ver N
 * problemas, y quien lo corre quiere la lista entera de una vez.
 */
export function checkWorkbench(dir: string): WorkbenchProblem[] {
  const ruta = join(dir, 'manifiesto.json')
  if (!existsSync(ruta)) {
    return [{ problem: `falta manifiesto.json en ${dir}` }]
  }
  let m: WorkbenchManifest
  try {
    m = JSON.parse(readFileSync(ruta, 'utf8')) as WorkbenchManifest
  } catch (e) {
    return [{ problem: `manifiesto.json no parsea: ${(e as Error).message}` }]
  }

  const ps: WorkbenchProblem[] = []
  for (const k of REQUIRED_KEYS) {
    // Una clave presente pero vacía se reporta igual que ausente: el
    // placeholder que pasa un check de presencia y no dice nada es exactamente
    // el defecto de H-DOCS-1036.
    if (!noVacia(m[k])) ps.push({ key: k, problem: `${k}: ausente o vacía` })
  }
  if (ps.length > 0) return ps

  const id = basename(dir)
  if (m.evento !== id) {
    ps.push({ key: 'evento', problem: `evento '${m.evento}' no es el nombre del directorio '${id}'` })
  }

  const esperada = runIdDate(id)
  if (esperada === null) {
    ps.push({ problem: `el identificador '${id}' no lleva sufijo ISO básico; su fecha no se puede verificar` })
  } else if (m.fecha !== esperada) {
    ps.push({ key: 'fecha', problem: `fecha '${m.fecha}' no deriva del ID (esperada ${esperada})` })
  }

  if (!existsSync(join(dir, m.instrumento as string))) {
    ps.push({ key: 'instrumento', problem: `instrumento '${m.instrumento}' no existe en el banco` })
  }

  if (m.forma !== undefined) {
    const f = m.forma as WorkbenchForm
    if (!WORKBENCH_FORMS.includes(f)) {
      ps.push({ key: 'forma', problem: `forma '${String(m.forma)}' no es una de ${WORKBENCH_FORMS.join(' · ')}` })
    } else {
      for (const pieza of PIECES_BY_FORM[f]) {
        if (!existsSync(join(dir, pieza.replace(/\/$/, '')))) {
          ps.push({ problem: `${pieza} lo exige la forma '${f}'` })
        }
      }
    }
  }
  return ps
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** El ISO **básico** del identificador: sin separadores, porque el slug ya usa guiones. */
export function runIdFor(slug: string, now: Date): string {
  const d = `${now.getUTCFullYear()}${dosDigitos(now.getUTCMonth() + 1)}${dosDigitos(now.getUTCDate())}`
  const t = `${dosDigitos(now.getUTCHours())}${dosDigitos(now.getUTCMinutes())}${dosDigitos(now.getUTCSeconds())}`
  return `${slug}-${d}T${t}`
}

/**
 * Crea el banco con la anatomía del README y devuelve su ruta.
 *
 * **Omite `instrumento`, `metrica` y `ciega_a` a propósito.** Son las tres que
 * el andamiaje no puede saber, y omitir es distinto de rellenar: un placeholder
 * pasa el check de presencia y se lee como dato —H-DOCS-1036, un
 * `TIMESTAMP_PLACEHOLDER` que llegó al disco—, mientras que una clave ausente
 * la nombra el gate. Un banco recién andamiado NO es conforme, y eso es el
 * estado correcto: no está hecho hasta que tiene instrumento y declara qué mide
 * y qué no puede ver.
 */
export function scaffoldWorkbench(eventosDir: string, slug: string, now: Date = new Date()): string {
  if (ISO_BASICO.test(slug)) {
    throw new Error(`el slug '${slug}' ya trae sufijo ISO: acuñaría dos`)
  }
  const id = runIdFor(slug, now)
  const dir = join(eventosDir, id)
  mkdirSync(dir, { recursive: true })
  for (const sub of ['tests', 'salidas', 'sondas']) mkdirSync(join(dir, sub), { recursive: true })

  writeFileSync(join(dir, 'manifiesto.json'), `${JSON.stringify({
    evento: id,
    fecha: runIdDate(id),
  }, null, 2)}\n`)

  // El puntero vive DENTRO del evento (h-docs-400): guardarlo fuera dejó una
  // vez las trece piezas a salvo y el puntero a ellas no.
  writeFileSync(join(dir, '.ruta-del-evento'), `${relative(resolve(eventosDir, '..', '..'), dir)}\n`)

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
