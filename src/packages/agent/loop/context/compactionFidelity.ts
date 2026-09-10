/**
 * ¿Sobrevive un hecho verificado a una compactación real?
 *
 * `react-verification-gate.md` §6-bis mide el **prompt** de resumen (`XWo` del
 * ejecutable 2.1.258) y de ahí deriva qué está garantizado: las directivas
 * permanentes y las prohibiciones van verbatim porque el prompt lo exige. De la
 * evidencia no dice nada — y de ahí salía la conclusión, que era una inferencia
 * sobre el texto del prompt, no una medición de su resultado.
 *
 * Este módulo mide el resultado. No fabrica una sonda sintética: los episodios
 * ya ocurrieron y están en el transcript de la sesión, así que la medición es
 * **retrospectiva** sobre compactaciones reales.
 *
 * **Los dos sentidos no valen lo mismo, y ésa es la mitad del diseño.**
 *
 * - **Supervivencia** (origen → resumen) está **confundida**: que una cifra no
 *   aparezca en el resumen puede significar que se deformó o que se descartó
 *   por irrelevante, y el instrumento no los separa. Se publica, no se
 *   concluye.
 * - **Fabricación** (resumen → universo anterior) **no** lo está: una cifra en
 *   el resumen sin ningún antecedente en todo lo que la precede no tiene
 *   lectura benigna. Es el sentido que discrimina.
 *
 * *Métrica:* números de ≥3 dígitos, con el separador de millar normalizado y el
 * punto decimal conservado, sobre texto, pensamiento, resultado de herramienta
 * y adjunto.
 * *Ciega a:* (ya NO a la lista de códigos —`{408,429,500}`—: #38 la separó del
 * millar leyendo los delimitadores de colección; ver `normalize`.) Sigue ciega a
 * todo hecho que no sea una cifra — un nombre de archivo mal citado,
 * una directiva parafraseada, una conclusión invertida; y a la cifra que
 * reaparece por coincidencia, que cuenta como superviviente sin serlo. Mide una
 * **cota inferior** de la deformación, nunca su ausencia.
 */
import type { TranscriptLine } from '../transcript.ts'

/** ≥3 dígitos: por debajo, un número reaparece por azar y no rastrea nada. */
export const MIN_DIGITS = 3

/** Cuánto contexto acompaña a una cifra fabricada para poder juzgarla. */
export const CONTEXT_CHARS = 40

/**
 * Normaliza el separador de millar **sin** tocar el punto decimal.
 *
 * `126 029`, `126,029` y `126029` son la misma cifra; `4.24` es otra. El
 * proyecto escribe las tres formas —el espacio fino es la convención de sus
 * `.rst`— así que sin esta normalización la misma cifra se leería como dos
 * distintas a cada lado de la frontera.
 *
 * **La coma es ambigua** —también separa items de lista— y el espacio no. Por
 * eso el run se ancla como MAXIMAL: los lookarounds excluyen dígito, coma y los
 * delimitadores de colección `{`/`[`/`}`/`]` a ambos lados, así una lista
 * `{408,429,…}` no empareja (empieza tras `{`, sigue tras `,`) y `126,029` sí.
 * Ver #38.
 */
function normalize(text: string): string {
  return text.replace(/(?<![\d{[,])(\d{1,3}(?:[\s  ,]\d{3})+)(?![\d}\],])/g, (m) => m.replace(/[\s  ,]/g, ''))
}

/**
 * **#38 (resuelto):** una lista de cifras de tres dígitos —`{408,429,500,502,
 * 503,529}`— se fundía en un número de 18 dígitos, porque el separador de
 * millar y el de lista son el mismo carácter (1 de 256, corrida 2026-09-02).
 * La discriminación es la que la tarea pedía: leer los delimitadores de
 * colección. El `normalize` ancla el run como MAXIMAL —excluye dígito, coma y
 * `{`/`[`/`}`/`]` a ambos lados— así un run dentro de `{}` no empareja en
 * ninguna posición y sus items quedan como cifras separadas; `126,029` fuera
 * de una colección sí se normaliza. Sin superficie nueva: dos lookarounds.
 */
/**
 * Las cifras del UNIVERSO — la guarda izquierda relajada al guion.
 *
 * **La guarda estricta es asimétrica y ésa fue su falla.** `1004` dentro de
 * `H-DOCS-1004` se excluye correctamente cuando la pregunta es «¿qué cifras
 * cita este resumen?»; excluirlo también del universo hace que el mismo
 * `1004`, citado suelto por el resumen —«Max H-DOCS id now 1004»— aparezca
 * sin antecedente. La cifra existía; el instrumento no la tenía.
 *
 * De ahí el reparto: **el filtro estricto se aplica a lo que se PREGUNTA, el
 * laxo a aquello CONTRA lo que se compara.** Un universo de más produce
 * falsos negativos —una fabricación real que pasa— y uno de menos produce
 * falsos positivos, que es lo que ocurrió: 6 de 6.
 */
export function universeNumbers(text: string): Set<string> {
  const salida = new Set(distinctiveNumbers(text))
  // La relajación es de los DOS lados y NO simétrica:
  //   izquierda — sale el guion (`H-DOCS-1004`), quedan `.` y `:`, así la
  //     hora `09:50:48` sigue fuera;
  //   derecha  — salen el guion y los dos puntos (`1127:` de un `grep -n`),
  //     queda `.`, así `1264603652.diag.log` sigue fuera.
  // El hash `366c04b2` sigue bloqueado por la letra, que no se relaja en
  // ningún lado.
  for (const m of normalize(text).matchAll(/(?<![\w./:])\d+(?:\.\d+)?(?![\w.])/g)) {
    const crudo = m[0]
    if (crudo.replace('.', '').length >= MIN_DIGITS) salida.add(crudo)
  }
  return salida
}

/**
 * ¿Tiene la cifra `n` un antecedente en el universo?
 *
 * Directo si está; y si `n` trae decimales, también cuando alguna cifra del
 * universo **redondea a ella**. Medido: la fuente dice `usd_fable_1h: 15.6008`
 * y el resumen escribe «15.60 USD» — cadenas distintas, misma medición. Un
 * resumen que redondea está haciendo su trabajo, y llamarlo fabricación
 * confunde *«el modelo inventó una cifra»* con *«el modelo la citó con menos
 * decimales»*, que son dos fenómenos con conductas opuestas.
 *
 * El redondeo **no** se aplica a enteros: ahí un prefijo es otra cifra
 * (`126` no es antecedente de `126029`).
 */
export function hasAntecedent(n: string, universe: ReadonlySet<string>): boolean {
  if (universe.has(n)) return true
  const punto = n.indexOf('.')
  if (punto < 0) return false
  const decimales = n.length - punto - 1
  const valor = Number.parseFloat(n)
  if (!Number.isFinite(valor)) return false
  for (const u of universe) {
    const uv = Number.parseFloat(u)
    if (!Number.isFinite(uv)) continue
    if (Number(uv.toFixed(decimales)) === valor) return true
  }
  return false
}

/** Las cifras rastreables de un texto, ya normalizadas y sin repetir. */
export function distinctiveNumbers(text: string): Set<string> {
  const salida = new Set<string>()
  // Las cuatro guardas laterales — letra, punto, guion, barra y dos puntos —
  // son las cuatro formas en que un ordinal se disfraza de cifra en este
  // corpus: `366c04b2` (hash), `H-DOCS-1005` (hallazgo), `T-008/025/026`
  // (tareas) y `09:50:48.599` (hora). Las cuatro salieron de corridas reales,
  // no de imaginar casos: la primera versión del instrumento las contó todas.
  for (const m of normalize(text).matchAll(/(?<![\w.\-/:])\d+(?:\.\d+)?(?![\w\-/:])/g)) {
    const crudo = m[0]
    if (crudo.replace('.', '').length >= MIN_DIGITS) salida.add(crudo)
  }
  return salida
}

/**
 * Todo el texto que una línea aporta al contexto.
 *
 * El universo es **ancho a propósito**: un hecho entra tanto por lo que el
 * modelo escribe como por lo que una herramienta devuelve. Mirar sólo los
 * bloques `text` marcaría como fabricada cada cifra que vino de un comando —
 * el falso positivo más caro que este instrumento puede cometer.
 */
export function textOfLine(line: TranscriptLine & Record<string, unknown>): string {
  const trozos: string[] = []
  const contenido = (line as { message?: { content?: unknown } }).message?.content
  if (typeof contenido === 'string') trozos.push(contenido)
  else if (Array.isArray(contenido)) {
    for (const b of contenido as Record<string, unknown>[]) {
      for (const clave of ['text', 'thinking', 'content', 'input']) {
        const v = b[clave]
        if (typeof v === 'string') trozos.push(v)
        else if (v !== undefined && v !== null) trozos.push(JSON.stringify(v))
      }
    }
  }
  for (const clave of ['toolUseResult', 'attachment']) {
    const v = (line as Record<string, unknown>)[clave]
    if (typeof v === 'string') trozos.push(v)
    else if (v !== undefined && v !== null) trozos.push(JSON.stringify(v))
  }
  return trozos.join('\n')
}

export type CompactionEpisode = {
  /** Ordinal del episodio dentro del archivo, 1-based. */
  index: number
  /** Línea del resumen (`isCompactSummary`). */
  summaryLine: number
  /** Cifras distintas en todo lo anterior a la frontera. */
  sourceCount: number
  /** Cifras distintas en el resumen. */
  summaryCount: number
  /** En el resumen y con antecedente: el sentido **confundido**. */
  survived: string[]
  /** En el origen y ausentes del resumen. Confundido igual: pudo ser descarte. */
  dropped: string[]
  /** En el resumen SIN antecedente en nada anterior: el sentido que discrimina. */
  fabricated: string[]
  /** Contexto de cada cifra fabricada, para poder juzgarla a mano. */
  context: Record<string, string>
}

export type FidelityReport = {
  episodes: CompactionEpisode[]
  /** Resúmenes cuya fuente no está en el archivo — no se miden, se declaran. */
  skipped: number
}

function isSummary(l: Record<string, unknown>): boolean {
  return l.isCompactSummary === true
}

/**
 * Recorre el transcript y mide cada compactación medible.
 *
 * «Medible» excluye el resumen que abre una sesión reanudada: su origen vivió
 * en otro archivo. Contarlo daría 0 % de supervivencia y esa cifra mediría la
 * ausencia del instrumento, no la del fenómeno — el sub-patrón D de
 * `metrica-decide-la-conclusion.md`.
 */
export function analyzeCompactions(lines: (TranscriptLine & Record<string, unknown>)[]): FidelityReport {
  const episodes: CompactionEpisode[] = []
  // El acumulado de TODO lo anterior, no el tramo: un resumen encadena hechos
  // de resúmenes previos, y medir por tramo los marcaría como fabricados.
  const universo = new Set<string>()
  let skipped = 0

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!
    if (!isSummary(l)) {
      for (const n of universeNumbers(textOfLine(l))) universo.add(n)
      continue
    }
    const texto = textOfLine(l)
    const delResumen = distinctiveNumbers(texto)
    if (universo.size === 0) {
      skipped++
      for (const n of delResumen) universo.add(n)
      continue
    }
    const survived = [...delResumen].filter((n) => hasAntecedent(n, universo))
    const fabricated = [...delResumen].filter((n) => !hasAntecedent(n, universo))
    const dropped = [...universo].filter((n) => !delResumen.has(n))
    const context: Record<string, string> = {}
    const plano = normalize(texto)
    for (const n of fabricated) {
      // El sitio se busca con las MISMAS guardas que la extracción: un
      // `indexOf` pelado señala la primera aparición del literal —dentro de
      // `H-DOCS-1004` o de `15.6008`— y no el sitio que el instrumento contó.
      // El triaje se hace leyendo este contexto: apuntar al sitio equivocado
      // hace que la cifra parezca un ordinal cuando no lo es, y al revés.
      const guardado = new RegExp(`(?<![\\w.\\-/:])${n.replace('.', '\\.')}(?![\\w\\-/:])`)
      const at = plano.search(guardado)
      context[n] = at < 0 ? n
        : plano.slice(Math.max(0, at - CONTEXT_CHARS), at + n.length + CONTEXT_CHARS).replace(/\s+/g, ' ')
    }
    episodes.push({
      index: episodes.length + 1,
      summaryLine: i + 1,
      sourceCount: universo.size,
      summaryCount: delResumen.size,
      survived, dropped, fabricated, context,
    })
    for (const n of delResumen) universo.add(n)
  }
  return { episodes, skipped }
}
