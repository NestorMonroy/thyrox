/**
 * Selección de pruebas por impacto (T-046…T-049, T-052).
 *
 * Dado un conjunto de rutas cambiadas, decide **qué pruebas las ejercitan**
 * en vez de correrlas all. El diseño y sus trade-offs están en
 * `docs: …/construir-harness-propio/analisis-seleccion-de-pruebas-por-impacto.rst`.
 *
 * Tres decisiones que no son de comodidad:
 *
 * - **No toca disco.** Recibe un `Io`. Eso es lo que lo hace usable desde
 *   cualquier repo —no sólo desde este paquete, que es la mitad abstracta que
 *   la directiva pide— y lo que permite probarlo sin fabricar un árbol.
 * - **La estrategia es intercambiable y su ceguera viaja con el resultado.**
 *   No hay una relación código→test universal: depende de la convención del
 *   proyecto. Fingir que la hay produce un selector que acierta en un repo y
 *   miente en los otros.
 * - **El denominador es obligatorio.** Un conteo sin él no es un resultado:
 *   con el alcance oculto, un selector ciego y uno correcto publican la misma
 *   cifra (`hallazgo-abierto-genera-sucesor.md`).
 */

/** Cómo se relaciona un fuente con las pruebas que lo ejercitan. */
export type Strategy = 'text-reference' | 'path-convention'

/** Lo que el selector necesita del mundo. Dos funciones, ningún `fs`. */
export type Io = {
  /** Las rutas de all las pruebas del proyecto. Es el denominador. */
  listTests: () => string[]
  /** El content de una test. Sólo lo usa la estrategia textual. */
  read: (path: string) => string
}

export type ImpactConfig = {
  strategy: Strategy
  /** El comando que corre un subconjunto. */
  runner: (paths: string[]) => string
  /** El comando de la suite entera, para cuando el cambio es transversal. */
  fullRunner: string
  /**
   * Rutas y patrones cuyo cambio fuerza la suite completa. **Se declara, no
   * se infiere**: inferirlo mal publica un verde que no midió lo que dice
   * medir — el sub-patrón D de `metrica-decide-la-conclusion.md`.
   */
  crossCutting?: string[]
  /** Sólo para `path-convention`: cómo se deriva la test del fuente. */
  pathPattern?: { from: string; to: string }
}

export type CrossCuttingVerdict =
  | { triggered: false }
  | { triggered: true; byPath: string; rule: string }

export type ImpactResult = {
  subset: string[]
  /** El comando a ejecutar, o `null` cuando no hay nada que correr. */
  command: string | null
  /** Cuántas entraron y sobre cuántas se midió. Las dos, siempre. */
  denominator: { selected: number; total: number }
  metric: string
  blindTo: string
  crossCutting: CrossCuttingVerdict
}

/** Qué mide y qué no ve cada estrategia. Viaja con el resultado, no en un comentario. */
const BLINDNESS: Record<Strategy, { metric: string; blindTo: string }> = {
  'text-reference': {
    metric: 'pruebas que mencionan el nombre del módulo cambiado',
    blindTo:
      'el consumidor que llega por herencia o inyección sin nombrar el módulo, ' +
      'y el homónimo: otro módulo del árbol con el mismo nombre de archivo',
  },
  'path-convention': {
    metric: 'la test hermana del fuente, derivada de su ruta',
    blindTo: 'TODO consumidor cruzado: un módulo compartido sólo trae su propia test',
  },
}

/**
 * Las dos anchorList de una ruta cambiada: su **ruta sin extensión** —lo que un
 * import contiene literalmente— y su **nombre de módulo**.
 *
 * `src/testing/io.ts` → `['src/testing/io', 'io']`.
 */
function anchors(path: string): string[] {
  const sinExt = path.replace(/\.[^./]+$/, '')
  const base = sinExt.split('/').pop() ?? sinExt
  return base && base !== sinExt ? [sinExt, base] : [sinExt]
}

/**
 * ¿Menciona el content esta ancla?
 *
 * Con **frontera de palabra**, no como subcadena. Medido contra el árbol real:
 * buscar `io` con `includes()` casa dentro de `compactacion`, `conversacion` y
 * `directorio`, y el selector devolvió 22 de 22 archivos — un filtro que no
 * filtra. El caso sintético no lo veía porque sus nombres (`loop`, `sse`,
 * `tools`) resultan distintivos por casualidad.
 */
function mentions(content: string, anchor: string): boolean {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(content)
}

/**
 * ¿Coincide la ruta con el patrón declarado? Admite `**` y `*`, y **exige
 * coincidencia completa**: `src/types.helper.ts` no puede activar la regla de
 * `src/types.ts` por parecerse.
 */
function matches(pattern: string, path: string): boolean {
  const escape = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const body = pattern.split('**').map((t) => escape(t).replace(/\*/g, '[^/]*')).join('.*')
  return new RegExp(`^${body}$`).test(path)
}

function crossCuttingVerdict(changed: string[], patterns: string[]): CrossCuttingVerdict {
  for (const path of changed) {
    for (const rule of patterns) {
      if (matches(rule, path)) return { triggered: true, byPath: path, rule }
    }
  }
  return { triggered: false }
}

/** Estrategia textual: la test nombra el módulo. Es la que sirve en cualquier lenguaje. */
function byTextReference(changed: string[], io: Io): string[] {
  const anchorList = changed.flatMap(anchors).filter(Boolean)
  if (anchorList.length === 0) return []
  return io.listTests().filter((test) => {
    const content = io.read(test)
    return anchorList.some((a) => mentions(content, a))
  })
}

/** Estrategia por convención: la test se deriva de la ruta, sin leer nada. */
function byPathConvention(changed: string[], config: ImpactConfig, io: Io): string[] {
  const pattern_ = config.pathPattern
  if (!pattern_) {
    throw new Error("La estrategia 'path-convention' exige `pathPattern`: sin él no hay de dónde derivar la test")
  }
  const existing = new Set(io.listTests())
  const re = new RegExp(pattern_.from)
  const derived = changed
    .map((path) => (re.test(path) ? path.replace(re, pattern_.to) : null))
    .filter((x): x is string => x !== null && existing.has(x))
  return [...new Set(derived)]
}

/**
 * Qué pruebas correr para estos cambios.
 *
 * Un cambio transversal **gana sobre la estrategia**: el subconjunto pasa a
 * ser el árbol entero y el veredicto nombra la ruta y la regla que lo
 * dispararon, para que quien lea el verde sepa qué lo produjo.
 */
export function selectTests(changed: string[], config: ImpactConfig, io: Io): ImpactResult {
  const total = io.listTests().length
  const { metric, blindTo } = BLINDNESS[config.strategy]
  const crossCutting = crossCuttingVerdict(changed, config.crossCutting ?? [])

  if (crossCutting.triggered) {
    const all = io.listTests()
    return {
      subset: all, command: config.fullRunner,
      denominator: { selected: all.length, total },
      metric: 'la suite completa: el cambio tocó una ruta declarada transversal',
      blindTo: 'nada dentro de la suite; sigue ciega a lo que la suite no cubre',
      crossCutting,
    }
  }

  const subset = (config.strategy === 'text-reference'
    ? byTextReference(changed, io)
    : byPathConvention(changed, config, io)
  ).sort()

  return {
    subset,
    // Sin pruebas seleccionadas NO se emite un comando: uno vacío se
    // ejecutaría como la suite entera en varios corredores, que es lo
    // contrario de lo que este selector existe para evitar.
    command: subset.length > 0 ? config.runner(subset) : null,
    denominator: { selected: subset.length, total },
    metric, blindTo, crossCutting,
  }
}
