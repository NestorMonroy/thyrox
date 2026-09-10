/**
 * Porte de `ccnmt: packages/agent/tasks/pillLabel.ts` — la etiqueta
 * compacta de la pildora del pie de pantalla para un conjunto de tareas
 * de fondo. La usan tanto la pildora del pie como la linea de duracion
 * de turno del transcript, para que las dos superficies concuerden en
 * terminologia.
 *
 * La fuente trae tres dependencias de paquetes hermanos del monorepo
 * `ccnmt` que este arbol NO tiene, y el alcance de este porte se limita a
 * `tasks.ts`, `errors.ts` y este archivo — no se crea un archivo nuevo en
 * otra raiz solo para alojar un reexport. Las tres se resuelven asi:
 *
 * 1. `@claude-code-how-works/output/constants/figures.js` — declara 24
 *    constantes de glifo (`BLACK_CIRCLE`, `EFFORT_LOW`, `FLAG_ICON`, …).
 *    Este modulo solo lee dos: `DIAMOND_OPEN` (◇, en ejecucion) y
 *    `DIAMOND_FILLED` (◆, completado/fallido). Se portan SOLO esas dos,
 *    verbatim (mismo codepoint), declaradas y exportadas aqui mismo —
 *    las 22 restantes no se usan en esta rama y no se portan.
 *
 * 2. `@claude-code-how-works/tool-registry/utils/array.js` — declara
 *    `intersperse`, `count` y `uniq`. Este modulo solo usa `count`
 *    (cuenta cuantos elementos de un arreglo cumplen un predicado); se
 *    porta solo esa, como funcion privada de este archivo — las otras
 *    dos no se usan aqui.
 *
 * 3. `@claude-code-how-works/repl/tasksTypes.js::BackgroundTaskState` —
 *    una union de 7 tipos de estado de tarea, cada uno importado de OTRO
 *    paquete hermano (`agent/tasks/DreamTask`, `swarm`,
 *    `agent/localAgentTask`, `repl/localShellTaskGuards`,
 *    `agent/tasks/LocalWorkflowTask`, `agent/tasks/MonitorMcpTask`,
 *    `tool-registry/tasks/RemoteAgentTask`) que tampoco existen en este
 *    arbol. Portar el tipo completo exigiria portar los 7. Como esta
 *    funcion (igual que en la fuente) solo LEE el discriminador `type` y
 *    un puñado de campos especificos de cada rama — nunca el resto del
 *    estado — se declara aqui un tipo LOCAL, estructural, que nombra
 *    exactamente esos campos por rama. Es una proyeccion fiel de lo que
 *    la funcion consume, no una copia de la union completa.
 */

/** ≙ `output/constants/figures.ts::DIAMOND_OPEN` — en ejecucion. */
export const DIAMOND_OPEN = '◇' // ◇

/** ≙ `output/constants/figures.ts::DIAMOND_FILLED` — completado/fallido. */
export const DIAMOND_FILLED = '◆' // ◆

/** ≙ `tool-registry/utils/array.ts::count`. */
function count<T>(arr: readonly T[], pred: (x: T) => unknown): number {
  let n = 0
  for (const x of arr) n += +!!pred(x)
  return n
}

/**
 * Proyeccion local y estructural de `BackgroundTaskState` — ver el punto 3
 * del docstring del modulo. Cada variante nombra solo los campos que
 * `getPillLabel`/`pillNeedsCta` leen.
 */
export type BackgroundTaskState =
  | { type: 'local_bash'; kind: 'shell' | 'monitor' }
  | { type: 'in_process_teammate'; identity: { teamName: string } }
  | { type: 'local_agent' }
  | {
      type: 'remote_agent'
      isUltraplan?: boolean
      ultraplanPhase?: 'plan_ready' | 'needs_input'
    }
  | { type: 'local_workflow' }
  | { type: 'monitor_mcp' }
  | { type: 'dream' }

/**
 * Produce la etiqueta compacta de la pildora del pie para un conjunto de
 * tareas de fondo. La usan tanto la pildora del pie como la linea de
 * duracion de turno del transcript, para que las dos superficies
 * concuerden en terminologia.
 */
export function getPillLabel(tasks: BackgroundTaskState[]): string {
  const n = tasks.length
  const allSameType = tasks.every(t => t.type === tasks[0]!.type)

  if (allSameType) {
    switch (tasks[0]!.type) {
      case 'local_bash': {
        const monitors = count(
          tasks,
          t => t.type === 'local_bash' && t.kind === 'monitor',
        )
        const shells = n - monitors
        const parts: string[] = []
        if (shells > 0)
          parts.push(shells === 1 ? '1 shell' : `${shells} shells`)
        if (monitors > 0)
          parts.push(monitors === 1 ? '1 monitor' : `${monitors} monitors`)
        return parts.join(', ')
      }
      case 'in_process_teammate': {
        const teamCount = new Set(
          tasks.map(t =>
            t.type === 'in_process_teammate' ? t.identity.teamName : '',
          ),
        ).size
        return teamCount === 1 ? '1 team' : `${teamCount} teams`
      }
      case 'local_agent':
        return n === 1 ? '1 local agent' : `${n} local agents`
      case 'remote_agent': {
        const first = tasks[0]!
        // Segun el mockup de diseño: ◇ diamante abierto mientras
        // corre/necesita entrada, ◆ relleno una vez que ExitPlanMode
        // espera aprobacion.
        if (n === 1 && first.type === 'remote_agent' && first.isUltraplan) {
          switch (first.ultraplanPhase) {
            case 'plan_ready':
              return `${DIAMOND_FILLED} ultraplan ready`
            case 'needs_input':
              return `${DIAMOND_OPEN} ultraplan needs your input`
            default:
              return `${DIAMOND_OPEN} ultraplan`
          }
        }
        return n === 1
          ? `${DIAMOND_OPEN} 1 cloud session`
          : `${DIAMOND_OPEN} ${n} cloud sessions`
      }
      case 'local_workflow':
        return n === 1 ? '1 background workflow' : `${n} background workflows`
      case 'monitor_mcp':
        return n === 1 ? '1 monitor' : `${n} monitors`
      case 'dream':
        return 'dreaming'
    }
  }

  return `${n} background ${n === 1 ? 'task' : 'tasks'}`
}

/**
 * True cuando la pildora debe mostrar el llamado a la accion atenuado
 * " · ↓ to view". Segun el diagrama de estados: solo los dos estados de
 * atencion (needs_input, plan_ready) muestran el CTA; correr sin mas
 * muestra solo el diamante + etiqueta.
 */
export function pillNeedsCta(tasks: BackgroundTaskState[]): boolean {
  if (tasks.length !== 1) return false
  const t = tasks[0]!
  return (
    t.type === 'remote_agent' &&
    t.isUltraplan === true &&
    t.ultraplanPhase !== undefined
  )
}
