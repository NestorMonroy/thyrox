/**
 * Verificación de premisas de tarea (bloque 14).
 *
 * La descripción de una tarea es una **hipótesis fechada**: dice qué la
 * bloqueaba y qué afirma haber hecho, en el momento en que alguien la escribió.
 * Leerla no mide el árbol de hoy. Ese estado —persistido, declarado, sin
 * verificar— es el nivel 3 de `niveles-de-retencion.md`, y consumirlo como si
 * fuera un 2 es lo que produjo tres episodios en esta iniciativa: una tarea
 * bloqueada por una credencial que sólo bloqueaba la mitad, una cerrada cuyo
 * enunciado nombraba un símbolo ausente, y tres nunca medidas.
 *
 * El mecanismo es **abstracto**: ningún término de este proyecto entra en los
 * tipos. Lo único que toca el mundo es `PremiseIo`, y se inyecta.
 *
 * **Lo que NO hace, declarado:** no infiere premisas del texto de la tarea. Se
 * declaran. Inferirlas de prosa daría un veredicto que parece medido siendo
 * adivinado, que es peor que no tenerlo.
 */

/** Lo único que toca el mundo. Cada método puede declarar que no pudo medir. */
export type PremiseIo = {
  /** Archivos que caen bajo un alcance. Vacío = el alcance no casó nada. */
  list(scope: string): string[]
  read(path: string): string
  exists(path: string): boolean
  /** `undefined` = la variable no está definida (medible), no «no sé». */
  env(name: string): string | undefined
  /** `null` = no se pudo ejecutar. NO es un código de salida. */
  run(command: string): number | null
}

export type Predicate =
  | { kind: 'symbol-present'; symbol: string; in: string }
  | { kind: 'symbol-absent'; symbol: string; in: string }
  | { kind: 'path-exists'; path: string }
  | { kind: 'path-absent'; path: string }
  | { kind: 'env-present'; name: string }
  | { kind: 'env-absent'; name: string }
  | { kind: 'command-exit'; command: string; exit: number }

export type TaskPremise = {
  id: string
  /** Abierta = todavía no se declara hecha. */
  open: boolean
  /** Mientras TODOS se cumplan, la tarea sigue bloqueada. */
  blockedWhile?: Predicate[]
  /**
   * Lo que su enunciado da por supuesto para tener sentido.
   *
   * Distinto de `blockedWhile`: una tarea que dice «portar X» presupone que X
   * falta — esa ausencia no la **bloquea**, la **justifica**. Si resulta falsa,
   * la tarea no pasa a ejecutable: pasa a re-encuadrar, porque su enunciado
   * describe un árbol que ya no es el de hoy.
   *
   * Se mide en los dos estados: lo que una tarea cerrada supuso también pudo
   * cambiar, y entonces su cierre se leyó contra otro árbol.
   */
  presupposes?: Predicate[]
  /** Lo que su enunciado afirma que ya existe. Se mide al cerrarla. */
  claims?: Predicate[]
}

/**
 * Seis, y ninguno se colapsa con otro. Dos lo sostienen todo:
 *
 * - `unmeasurable` — colapsarlo con `blocked` convierte el silencio del
 *   instrumento en un bloqueo, que es la ceguera que este módulo cierra.
 * - `stale` — la **presuposición** del enunciado resultó falsa. Colapsarlo con
 *   `actionable` diría «adelante» donde el hecho es «párate y re-encuadra»: son
 *   conductas opuestas sobre la misma tarea. La distinción se pagó al mapear
 *   las señales del detector, que no cabían en ninguno de los dos huecos que
 *   había (`blockedWhile` es lo que me frena; `claims` es lo que afirmo haber
 *   hecho; ninguno es lo que doy por supuesto).
 */
export type Verdict = 'actionable' | 'blocked' | 'overclaimed' | 'verified' | 'unmeasurable' | 'stale'

/** El resultado de UN predicado. `held: null` = no se pudo medir. */
export type PredicateResult = { predicate: Predicate; held: boolean | null; note: string }

export type Assessment = {
  id: string
  verdict: Verdict
  reason: string
  evidence: PredicateResult[]
}

/** Nombra el predicado en la razón: sin esto la razón es genérica y no acota nada. */
function label(p: Predicate): string {
  switch (p.kind) {
    case 'symbol-present':
    case 'symbol-absent':
      return `${p.symbol} en ${p.in}`
    case 'path-exists':
    case 'path-absent':
      return p.path
    case 'env-present':
    case 'env-absent':
      return p.name
    case 'command-exit':
      return p.command
  }
}

/** Frontera de palabra: `alf` no es el símbolo `alfa`. Un substring mide otra cosa. */
function mentions(content: string, symbol: string): boolean {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(content)
}

function symbolInScope(io: PremiseIo, symbol: string, scope: string): boolean | null {
  const files = io.list(scope)
  // Un alcance que no casa nada NO es ausencia: «no está» y «miré donde no era»
  // dan la misma salida, así que el instrumento declara que no midió.
  if (files.length === 0) return null
  return files.some((f) => mentions(io.read(f), symbol))
}

export function evaluate(p: Predicate, io: PremiseIo): PredicateResult {
  switch (p.kind) {
    case 'symbol-present': {
      const hay = symbolInScope(io, p.symbol, p.in)
      return { predicate: p, held: hay, note: hay === null ? `el alcance ${p.in} no casó ningún archivo` : `` }
    }
    case 'symbol-absent': {
      const hay = symbolInScope(io, p.symbol, p.in)
      return { predicate: p, held: hay === null ? null : !hay, note: hay === null ? `el alcance ${p.in} no casó ningún archivo` : `` }
    }
    case 'path-exists':
      return { predicate: p, held: io.exists(p.path), note: '' }
    case 'path-absent':
      return { predicate: p, held: !io.exists(p.path), note: '' }
    case 'env-present':
      return { predicate: p, held: io.env(p.name) !== undefined, note: '' }
    case 'env-absent':
      return { predicate: p, held: io.env(p.name) === undefined, note: '' }
    case 'command-exit': {
      const code = io.run(p.command)
      return {
        predicate: p,
        held: code === null ? null : code === p.exit,
        note: code === null ? `no se pudo ejecutar ${p.command}` : '',
      }
    }
  }
}

function unmeasurable(id: string, evidence: PredicateResult[], sinMedir: PredicateResult[]): Assessment {
  const razones = sinMedir.map((r) => r.note || label(r.predicate))
  return { id, verdict: 'unmeasurable', reason: razones.join('; '), evidence }
}

export function assessPremise(task: TaskPremise, io: PremiseIo): Assessment {
  const bloqueos = task.blockedWhile ?? []
  const afirmaciones = task.claims ?? []
  const supuestos = task.presupposes ?? []

  // Una tarea sin premisas declaradas NO es `verified`: nadie la midió.
  if (bloqueos.length === 0 && afirmaciones.length === 0 && supuestos.length === 0) {
    return { id: task.id, verdict: 'unmeasurable', reason: 'sin premisas declaradas', evidence: [] }
  }

  // La presuposición se mide ANTES que nada: si el enunciado describe otro
  // árbol, medir su bloqueo o su afirmación es medir sobre una premisa falsa.
  if (supuestos.length > 0) {
    const evidenciaSupuestos = supuestos.map((p) => evaluate(p, io))
    const sinMedirSupuestos = evidenciaSupuestos.filter((r) => r.held === null)
    if (sinMedirSupuestos.length > 0) return unmeasurable(task.id, evidenciaSupuestos, sinMedirSupuestos)
    const rotos = evidenciaSupuestos.filter((r) => r.held === false)
    if (rotos.length > 0) {
      return {
        id: task.id,
        verdict: 'stale',
        reason: `su enunciado da por supuesto lo que el árbol contradice: ${rotos.map((r) => label(r.predicate)).join(', ')}`,
        evidence: evidenciaSupuestos,
      }
    }
  }

  const relevantes = task.open ? bloqueos : afirmaciones
  // Una tarea abierta sin bloqueos declarados, o cerrada sin afirmaciones, cae
  // en el mismo hueco que la de arriba: hay premisas, pero ninguna aplica aquí.
  if (relevantes.length === 0) {
    // Con supuestos declarados y ninguno roto, la premisa del enunciado se
    // sostiene: eso SÍ es una medición, y decir «no medí» la desperdiciaría.
    if (supuestos.length > 0) {
      return {
        id: task.id,
        verdict: task.open ? 'actionable' : 'verified',
        reason: 'lo que su enunciado supone sigue siendo cierto',
        evidence: supuestos.map((p) => evaluate(p, io)),
      }
    }
    return {
      id: task.id,
      verdict: 'unmeasurable',
      reason: task.open ? 'sin premisas declaradas para una tarea abierta' : 'sin premisas declaradas para una tarea cerrada',
      evidence: [],
    }
  }

  const evidence = relevantes.map((p) => evaluate(p, io))
  const sinMedir = evidence.filter((r) => r.held === null)
  if (sinMedir.length > 0) return unmeasurable(task.id, evidence, sinMedir)

  if (task.open) {
    const caidos = evidence.filter((r) => r.held === false)
    if (caidos.length === 0) {
      return {
        id: task.id,
        verdict: 'blocked',
        reason: `sigue bloqueada: ${evidence.map((r) => label(r.predicate)).join(', ')}`,
        evidence,
      }
    }
    return {
      id: task.id,
      verdict: 'actionable',
      reason: `su bloqueo ya no se cumple: ${caidos.map((r) => label(r.predicate)).join(', ')}`,
      evidence,
    }
  }

  const incumplidas = evidence.filter((r) => r.held === false)
  if (incumplidas.length === 0) {
    return { id: task.id, verdict: 'verified', reason: 'lo que afirma está en el árbol', evidence }
  }
  // La razón nombra SÓLO lo que falta: acota el defecto en vez de repetir el enunciado.
  return {
    id: task.id,
    verdict: 'overclaimed',
    reason: `cerrada, pero su enunciado nombra lo que no está: ${incumplidas.map((r) => label(r.predicate)).join(', ')}`,
    evidence,
  }
}

export type PremiseReport = {
  total: number
  measured: number
  byVerdict: Record<Verdict, number>
  assessments: Assessment[]
  actionable: Assessment[]
  overclaimed: Assessment[]
  /** Las que piden re-encuadre antes de despacharse. */
  stale: Assessment[]
}

/** El agregado publica su denominador: un conteo sin universo no es un resultado. */
export function assessAll(tasks: TaskPremise[], io: PremiseIo): PremiseReport {
  const assessments = tasks.map((t) => assessPremise(t, io))
  const byVerdict: Record<Verdict, number> = {
    actionable: 0, blocked: 0, overclaimed: 0, verified: 0, unmeasurable: 0, stale: 0,
  }
  for (const a of assessments) byVerdict[a.verdict] += 1
  return {
    total: tasks.length,
    measured: assessments.length - byVerdict.unmeasurable,
    byVerdict,
    assessments,
    actionable: assessments.filter((a) => a.verdict === 'actionable'),
    overclaimed: assessments.filter((a) => a.verdict === 'overclaimed'),
    stale: assessments.filter((a) => a.verdict === 'stale'),
  }
}
