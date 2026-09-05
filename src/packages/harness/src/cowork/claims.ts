/**
 * El claim ledger de coordinación (T-101, board #63).
 *
 * Fuente de la decisión: el DEC del bloque 24 de
 * ``tareas-construir-harness-propio`` y :ref:`analisis-cowork-en-nuestro-harness`.
 * El estado compartido de coordinación NO vive en el store SQLite —binario, sin
 * driver de merge por clon, e inescribible sin el harness
 * (:ref:`h-docs-1025`, :ref:`h-docs-1026`)— sino en un LEDGER DE TEXTO JSONL
 * versionado: git lo fusiona línea a línea por defecto, un humano lo apende con
 * ``echo >>``, y el harness sólo lo LEE para el overlap gate. La asimetría
 * —escribir con git-solo, leer con el harness— es la que el objetivo premia:
 * el usuario más probable es alguien SIN el harness instalado.
 *
 * Dos superficies distintas por su fuente de datos, ambas aquí:
 *
 *  - el **ledger** (``claim``/``release``/``whoHas``/``findOverlaps``): lo que
 *    una persona VA A editar, declarado ANTES del trabajo. El solape se mide por
 *    contención de prefijo de ruta.
 *  - **``fileOverlapGate``** (un ``CollisionGate``): lo que YA divergió entre dos
 *    refs, medido por ``git diff``. ``integrate()`` lo consulta antes de fusionar.
 *
 * El diff mide lo que ya divergió; el ledger, lo que se va a editar. Son
 * complementarios: ninguno ve lo del otro.
 */

import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

import type { CollisionCheck, CollisionGate, IntegrationRepo } from '../branchIntegration.ts'

/** Ruta relativa por defecto del ledger, versionada (NO ``.claude/agent-results/*``, que está git-ignored). */
export const DEFAULT_LEDGER_REL = '.claude/coordination/claims.jsonl'

/** Una operación del ledger. Append-only: nada se edita, sólo se apende. */
export interface ClaimRecord {
  /** Identificador GLOBALMENTE único, no un ordinal por sesión (la lección de :ref:`h-docs-1026`). */
  id: string
  op: 'claim' | 'release'
  /** Ruta o área que la persona reserva (relativa al repo). */
  path: string
  /** Quién reserva. */
  owner: string
  /** La rama del que reserva. */
  branch: string
  /** Tarea opcional que motiva la reserva. */
  task?: string
  /** Timestamp ISO de la operación. */
  at: string
}

/** Un ID globalmente único para una reserva — por construcción, sin ordinal que colisione. */
export function newClaimId(): string {
  return `c-${randomUUID()}`
}

/** Serializa una operación a su línea JSONL (una por línea; ``echo >>``-compatible). */
export function claimLine(rec: ClaimRecord): string {
  return JSON.stringify(rec)
}

/**
 * Lee el ledger. Un archivo ausente es un ledger vacío (``[]``), NO un error. Una
 * línea malformada SÍ es un error, con su número: una reserva ilegible es peor
 * callada que ruidosa (una persona podría no verse reservada por un typo).
 */
export function readLedger(ledgerPath: string): ClaimRecord[] {
  let raw: string
  try {
    raw = readFileSync(ledgerPath, 'utf8')
  } catch {
    return []
  }
  const out: ClaimRecord[] = []
  const lines = raw.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    let rec: ClaimRecord
    try {
      rec = JSON.parse(line) as ClaimRecord
    } catch (e) {
      throw new Error(`ledger ${ledgerPath}:${i + 1} — línea JSONL malformada: ${(e as Error).message}`)
    }
    out.push(rec)
  }
  return out
}

/**
 * Apende una operación al ledger, creando el directorio si hace falta. Es la vía
 * del harness; la vía del humano es ``echo '<línea>' >> <ledger>``, y produce el
 * mismo archivo — por eso ``claimLine`` es público.
 */
export function appendClaim(ledgerPath: string, rec: ClaimRecord): void {
  mkdirSync(dirname(ledgerPath), { recursive: true })
  appendFileSync(ledgerPath, `${claimLine(rec)}\n`)
}

/** Normaliza una ruta para comparar: sin ``/`` final, sin ``./`` inicial. */
function normPath(p: string): string {
  let s = p.trim().replace(/\/+$/, '')
  if (s.startsWith('./')) s = s.slice(2)
  return s
}

/**
 * ¿Se solapan dos rutas por contención de prefijo? Verdadero si son iguales, o si
 * una es directorio ancestro de la otra. El límite es ``/``: ``src/foo`` NO
 * contiene ``src/foobar`` (mismo prefijo de cadena, distinta ruta).
 */
export function pathsOverlap(a: string, b: string): boolean {
  const x = normPath(a)
  const y = normPath(b)
  if (x === y) return true
  return y.startsWith(`${x}/`) || x.startsWith(`${y}/`)
}

/**
 * Las reservas ACTIVAS: dobla el ledger en orden; una ``claim`` fija la reserva
 * ``(owner, path)`` y una ``release`` del mismo par la retira. El resto de
 * campos (id, branch, task, at) toman los de la última ``claim`` vigente.
 */
export function activeClaims(records: ClaimRecord[]): ClaimRecord[] {
  const held = new Map<string, ClaimRecord>()
  for (const rec of records) {
    const key = JSON.stringify([rec.owner, normPath(rec.path)])
    if (rec.op === 'claim') held.set(key, rec)
    else if (rec.op === 'release') held.delete(key)
  }
  return [...held.values()]
}

/** Reservas activas cuya ruta se solapa con ``path`` (en cualquiera de las dos direcciones de contención). */
export function whoHas(records: ClaimRecord[], path: string): ClaimRecord[] {
  return activeClaims(records).filter((c) => pathsOverlap(c.path, path))
}

/**
 * Pares de reservas activas de DUEÑOS DISTINTOS cuyas rutas se solapan — el
 * conflicto de coordinación que el ledger existe para surfacear ANTES del merge.
 * Dos reservas del mismo dueño sobre rutas anidadas NO son conflicto (es la misma
 * persona).
 */
export function findOverlaps(records: ClaimRecord[]): Array<[ClaimRecord, ClaimRecord]> {
  const active = activeClaims(records)
  const pairs: Array<[ClaimRecord, ClaimRecord]> = []
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (active[i].owner === active[j].owner) continue
      if (pathsOverlap(active[i].path, active[j].path)) pairs.push([active[i], active[j]])
    }
  }
  return pairs
}

function gitOut(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
}

/**
 * ``CollisionGate`` de solape de ARCHIVOS entre ``source`` y ``target``: los
 * archivos que AMBAS ramas cambiaron desde su ``merge-base``, por intersección de
 * ``git diff --name-only``. Es a los archivos lo que ``docsLabelCollisionGate`` es
 * a las etiquetas — un check cross-rama que ``integrate()`` consulta antes de
 * fusionar.
 *
 * ``git diff`` entre commits sólo lista rutas RASTREADAS, así que ``.gitignore``
 * no entra: mide el solape de lo versionado, que es exactamente el estado que
 * viaja entre ramas (p. ej. ``agent_store.sqlite3``). Si el ``merge-base`` no
 * resuelve, se declara ``ran:false`` (no medido) en vez de un ``0`` verde falso
 * (sub-patrón D de ``metrica-decide-la-conclusion``).
 */
export function fileOverlapGate(repo: IntegrationRepo): CollisionCheck {
  let base: string
  try {
    base = gitOut(repo.path, 'merge-base', repo.source, repo.target)
  } catch (e) {
    return { ran: false, collisions: 0, detail: `sin merge-base entre ${repo.source} y ${repo.target}: ${(e as Error).message}` }
  }
  if (!base) return { ran: false, collisions: 0, detail: `merge-base vacío entre ${repo.source} y ${repo.target}` }
  const changed = (ref: string): Set<string> => {
    const out = gitOut(repo.path, 'diff', '--name-only', base, ref, '--')
    return new Set(out.split('\n').map((l) => l.trim()).filter(Boolean))
  }
  const a = changed(repo.source)
  const b = changed(repo.target)
  const both = [...a].filter((p) => b.has(p)).sort()
  return {
    ran: true,
    collisions: both.length,
    detail: both.length
      ? `${both.length} archivo(s) tocado(s) por ambas ramas: ${both.join(', ')}`
      : `sin archivos solapados entre ${repo.source} y ${repo.target}`,
  }
}

/**
 * Compone varios ``CollisionGate`` en uno. ``integrate()`` consulta UN gate; para
 * correr etiquetas Y archivos a la vez se compone aquí. Semántica:
 *
 *  - ``ran`` = alguno midió (un gate no aplicable no finge un ``0``);
 *  - ``collisions`` = suma de los que midieron (basta uno con ≥1 para bloquear);
 *  - ``detail`` = concatenación.
 */
export function combineGates(...gates: CollisionGate[]): CollisionGate {
  return (repo: IntegrationRepo): CollisionCheck => {
    const checks = gates.map((g) => g(repo))
    const ran = checks.some((c) => c.ran)
    const collisions = checks.filter((c) => c.ran).reduce((s, c) => s + c.collisions, 0)
    const detail = checks.map((c) => c.detail).join(' · ')
    return { ran, collisions, detail }
  }
}

/**
 * El ledger vive en la RAÍZ del repositorio, no en el directorio de trabajo.
 *
 * El párrafo de cabecera declara la propiedad por la que este archivo existe:
 * «git lo fusiona línea a línea por defecto». Esa propiedad es de un archivo
 * versionado, así que anclar la ruta al ``cwd`` la pierde en silencio — desde
 * un subdirectorio se escribe un ledger distinto, y el overlap gate informa
 * cero solapes donde hay uno. Un cero de ese instrumento no distingue «nadie
 * reservó» de «leí otro archivo», que es el sub-patrón D de
 * ``metrica-decide-la-conclusion.md``.
 *
 * Fuera de un repositorio se REHÚSA en vez de escribir: sin git no hay fusión
 * línea a línea, y un ledger sin esa propiedad no es el mecanismo que la
 * cabecera describe.
 *
 * DUPLICADO TEMPORAL: el dueño canónico es ``thyrox: src/coordination/ledger.ts``
 * (``thyrox@a1a4fd8``). Este cuerpo se colapsa a una reexportación cuando P3c
 * mueva ``packages`` a thyrox y el import entre repos deje de estar bloqueado
 * — tarea #138.
 */
export function ledgerPathFor(cwd: string, explicit?: string): string {
  if (explicit !== undefined) return explicit
  const top = gitTopLevel(cwd)
  if (top === null) {
    throw new Error(
      `no hay repositorio git en '${cwd}' ni por encima: el ledger de ` +
        'coordinación se fusiona línea a línea con git, así que fuera de un ' +
        'repositorio no tiene la propiedad por la que existe. Nombra una ruta ' +
        'explícita si de verdad quieres escribir ahí.',
    )
  }
  return join(top, DEFAULT_LEDGER_REL)
}

/** La raíz del repositorio que contiene ``start``, o ``null`` si no hay ninguno. */
export function gitTopLevel(start: string): string | null {
  try {
    return execFileSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

/**
 * Clasifica un archivo solapado por lo que git HARÁ con él al fusionar. Distingue
 * lo que git fusiona (texto 3-way, o binario con su driver instalado en este clon)
 * de lo que git NO puede fusionar (binario sin driver → conflicto que se queda con
 * nuestro lado y pierde el del otro). El discriminante del driver es doble, medido
 * (:ref:`h-docs-1025`): ``.gitattributes`` NOMBRA al driver, pero la DEFINICIÓN va
 * en ``.git/config``, que no se versiona — un clon con el atributo y sin la config
 * cae al conflicto binario. Por eso no basta ``check-attr``: hay que confirmar que
 * ``merge.<driver>.driver`` resuelve en este clon.
 */
function classifyMergePath(
  cwd: string,
  path: string,
  binaryByContent: boolean,
): { driverGap: boolean; reason: string } {
  // git check-attr merge -- <path>  ->  "<path>: merge: <valor>"
  let attr = 'unspecified'
  try {
    const out = gitOut(cwd, 'check-attr', 'merge', '--', path)
    const m = out.match(/: merge: (.+)$/)
    if (m) attr = m[1].trim()
  } catch {
    /* deja unspecified */
  }
  // -merge explícito (binario): git nunca fusiona su contenido.
  if (attr === 'unset') return { driverGap: true, reason: 'binario (-merge)' }
  // Driver nombrado: seguro SÓLO si su definición existe en este clon.
  if (attr !== 'set' && attr !== 'unspecified') {
    // Drivers INCORPORADOS a git: no tienen entrada en config y ninguno deja caer
    // un lado (``union`` concatena ambos, ``text`` fuerza 3-way). ``binary`` sí.
    if (attr === 'union') return { driverGap: false, reason: 'union (incorporado)' }
    if (attr === 'text') return { driverGap: false, reason: 'texto (incorporado)' }
    if (attr === 'binary') return { driverGap: true, reason: 'merge=binary' }
    let driverCfg = ''
    try {
      driverCfg = gitOut(cwd, 'config', '--get', `merge.${attr}.driver`)
    } catch {
      driverCfg = ''
    }
    if (driverCfg) return { driverGap: false, reason: `driver «${attr}» instalado` }
    return { driverGap: true, reason: `driver «${attr}» declarado pero NO configurado en este clon` }
  }
  // Sin atributo especial: texto 3-way. PERO si el contenido es binario, git lo
  // trata como binario al fusionar (conflicto, se queda con nuestro lado) — cierra
  // la ceguera de check-attr, que da «unspecified» aun para un binario sin atributo.
  if (binaryByContent) return { driverGap: true, reason: 'binario por contenido, sin driver' }
  return { driverGap: false, reason: 'texto 3-way' }
}

/**
 * ``CollisionGate`` de solape de archivos CONSCIENTE DEL DRIVER: cuenta como
 * colisión SÓLO el solape que git dejaría caer (binario sin driver instalado); el
 * que git fusiona (texto, o binario con driver) va en ``detail`` sin bloquear. Es
 * la variante que ``integrate()`` compone por defecto: sin ella, el solape SIEMPRE
 * presente del store binario bloquearía todo merge l0↔l2/l0↔l3 para siempre. Con el
 * driver ``sqlite-union`` instalado (``scripts/install-hooks.sh``), el store pasa a
 * ``detail`` y deja de bloquear — que es justo lo que su instalación desbloquea.
 *
 * ``fileOverlapGate`` (crudo) sigue existiendo para «qué solapa en absoluto»; ésta
 * responde «qué solape es peligroso». Si el ``merge-base`` no resuelve, ``ran:false``
 * (no medido) en vez de un ``0`` verde falso (sub-patrón D de
 * ``metrica-decide-la-conclusion``).
 */
export function driverAwareFileOverlapGate(repo: IntegrationRepo): CollisionCheck {
  let base: string
  try {
    base = gitOut(repo.path, 'merge-base', repo.source, repo.target)
  } catch (e) {
    return { ran: false, collisions: 0, detail: `sin merge-base entre ${repo.source} y ${repo.target}: ${(e as Error).message}` }
  }
  if (!base) return { ran: false, collisions: 0, detail: `merge-base vacío entre ${repo.source} y ${repo.target}` }
  // git diff --numstat: para un archivo binario las columnas add/del son «-».
  const scan = (ref: string): { changed: Set<string>; binary: Set<string> } => {
    const out = gitOut(repo.path, 'diff', '--numstat', base, ref, '--')
    const changed = new Set<string>()
    const binary = new Set<string>()
    for (const line of out.split('\n')) {
      const parts = line.split('\t')
      if (parts.length < 3) continue
      const add = parts[0]
      const del = parts[1]
      const p = parts.slice(2).join('\t').trim()
      if (!p) continue
      changed.add(p)
      if (add === '-' && del === '-') binary.add(p)
    }
    return { changed, binary }
  }
  const a = scan(repo.source)
  const b = scan(repo.target)
  const both = [...a.changed].filter((p) => b.changed.has(p)).sort()
  const drops: string[] = []
  const mergeable: string[] = []
  for (const p of both) {
    const bin = a.binary.has(p) || b.binary.has(p)
    const cls = classifyMergePath(repo.path, p, bin)
    ;(cls.driverGap ? drops : mergeable).push(`${p} (${cls.reason})`)
  }
  const detail: string[] = []
  if (drops.length) detail.push(`git dejaría caer un lado en ${drops.length}: ${drops.join(', ')}`)
  if (mergeable.length) detail.push(`git fusiona ${mergeable.length}: ${mergeable.join(', ')}`)
  if (!both.length) detail.push(`sin archivos solapados entre ${repo.source} y ${repo.target}`)
  return { ran: true, collisions: drops.length, detail: detail.join(' · ') }
}
