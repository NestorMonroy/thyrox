/**
 * El puente de una sola dirección: los `- [ ]` de un `tareas-<slug>.rst` leídos
 * como entradas de tablero (T-062).
 *
 * La pregunta que lo motiva era literal — «¿el mecanismo es que TaskCreate/
 * TaskList lea `- [ ]` de un RST?». La respuesta medida es *importar, no
 * espejar*: el RST y el tablero no guardan lo mismo.
 *
 * | | `- [ ]` en el RST | fila del tablero |
 * |---|---|---|
 * | estado | dos: marcada o no | tres: `pending`, `in_progress`, `completed` |
 * | asociación | **ninguna columna**; a lo sumo prosa | `blocked_by_json` explícito |
 * | alcance | la iniciativa que lo aloja | la sesión, con ordinal del proyecto |
 *
 * De ahí que el puente importe y no sincronice: escribir de vuelta al RST
 * exigiría inventar la columna que el formato no tiene.
 *
 * **La forma NO se asume, se midió** sobre los 139 `tareas-*.rst` del corpus:
 * la casilla aparece con negrita y sin ella (195 + 261 marcadas), el id no es
 * `T-\d{3}` —hay `T-N.N`, `T-N-N`, `D-N` y un `DEC-`— y admite sufijos
 * (`[DECISIÓN]`, `(Alta)`). Un patrón que fijara tres dígitos sería ciego a
 * 61 entradas sólo por la forma `T-N-N`.
 */

export type RstTask = {
  /** El identificador tal como el RST lo escribe: `T-021`, `T-3.1`, `D-7`. */
  id: string
  /** El asunto, con las líneas de continuación recompuestas en una. */
  subject: string
  /** La casilla marcada. El RST no distingue «en curso» de «pendiente». */
  done: boolean
  /** Línea 1-based donde arranca la entrada: sin ella el puente no cita su origen. */
  line: number
  /**
   * Los ids que el cuerpo nombra tras un verbo de dependencia.
   *
   * *Métrica:* ids `X-N` que siguen a «depende de» / «bloqueada por» en el
   * cuerpo de la entrada.
   * *Ciega a:* la dependencia escrita sobre algo que no es una tarea
   * («depende de ``html_editor``» — medido, ocurre), y a la que no usa ninguno
   * de esos dos verbos. Sobre el corpus entero sólo **14** entradas declaran
   * bloqueo en prosa, así que este campo es una cota inferior por construcción,
   * no la asociación del tablero.
   */
  blockedBy: string[]
}

/** `- [x] **T-021** — asunto` en sus dos formas, con el id sin asumir dígitos. */
const CASILLA = /^- \[([ x])\] (?:\*\*)?([A-Z]{1,4}-[0-9][0-9.\-]*)/

/** El separador entre el id y el asunto: em-dash, guion o el cierre de negrita. */
const TRAS_EL_ID = /^(?:\*\*)?\s*(?:\[[^\]]*\]|\([^)]*\))?\s*(?:\*\*)?\s*[—-]?\s*/

const DEPENDENCIA = /(?:depende de|bloquead[ao] por|blocked by)\b/i
const ID_SUELTO = /\b([A-Z]{1,4}-[0-9][0-9.\-]*)\b/g

/**
 * Las entradas de un `tareas-<slug>.rst`.
 *
 * Una entrada termina donde empieza la siguiente casilla o donde se acaba la
 * indentación: las líneas indentadas son continuación del mismo asunto, que es
 * como el corpus las escribe (`T-021` ocupa tres).
 */
export function parseRstTasks(texto: string): RstTask[] {
  const lineas = texto.split('\n')
  const tareas: RstTask[] = []
  let actual: { id: string; done: boolean; line: number; partes: string[] } | null = null

  const cerrar = () => {
    if (!actual) return
    const cuerpo = actual.partes.join(' ').replace(/\s+/g, ' ').trim()
    tareas.push({
      id: actual.id,
      subject: cuerpo,
      done: actual.done,
      line: actual.line,
      blockedBy: dependenciasDe(cuerpo, actual.id),
    })
    actual = null
  }

  lineas.forEach((linea, i) => {
    const m = CASILLA.exec(linea)
    if (m) {
      cerrar()
      const resto = linea.slice(m[0].length).replace(TRAS_EL_ID, '')
      actual = { id: m[2], done: m[1] === 'x', line: i + 1, partes: [resto] }
      return
    }
    if (!actual) return
    // Continuación: indentada y no vacía. Una línea en blanco cierra la entrada.
    if (/^\s+\S/.test(linea)) actual.partes.push(linea.trim())
    else if (linea.trim() === '') cerrar()
    else cerrar()
  })
  cerrar()
  return tareas
}

/** Los ids nombrados tras un verbo de dependencia, sin contarse a sí misma. */
function dependenciasDe(cuerpo: string, propio: string): string[] {
  const marca = DEPENDENCIA.exec(cuerpo)
  if (!marca) return []
  const cola = cuerpo.slice(marca.index)
  const vistos = new Set<string>()
  for (const m of cola.matchAll(ID_SUELTO)) {
    if (m[1] !== propio) vistos.add(m[1])
  }
  return [...vistos]
}
