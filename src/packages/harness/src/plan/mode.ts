/**
 * Plan mode: el modo en que el agente diseña antes de tocar nada.
 *
 * Porte de la tercera superficie que el binario llama «plan». No es el tablero
 * de tareas ni el `Plan` de una herramienta: es un **modo de sesión** en el que
 * el agente explora, escribe su plan a UN archivo, y pide aprobación.
 *
 * Fuente del porte — el contrato lo fijan los esquemas de las dos herramientas
 * del binario 2.1.261, que son evidencia más fuerte que un identificador
 * minificado:
 *
 * - `EnterPlanMode` no recibe parámetros y **exige aprobación del usuario**.
 * - En el modo, el archivo de plan es *«the only file you can edit»*.
 * - `ExitPlanMode` **no recibe el contenido**: lo lee del archivo. Sólo señala
 *   que el plan está listo para revisión.
 * - La ruta se inyecta en el mensaje de sistema; por defecto
 *   `~/.claude/plans/`, o relativa a la raíz del proyecto si se configura.
 * - El mensaje ramifica: si el archivo existe, se lee y se edita de forma
 *   incremental; si no, se crea.
 *
 * Lo que este porte NO reproduce, y se declara en vez de inventarse: el
 * análisis que originó la tarea afirmaba **cuatro fases declaradas**. En el
 * ejecutable de esta sesión no se pudo confirmar ese conjunto — sí los tres
 * renderers (`agentId` → subagente, `sparse`, `full`) y los estados
 * `planMode*`. Se implementan los estados que el contrato exige, no cuatro
 * fases sin medir.
 *
 * *Métrica:* esquemas de `EnterPlanMode`/`ExitPlanMode` y literales
 * `planFilePath` / `planModeInstructions` / `sparse`-`full` del binario 2.1.261.
 * *Ciega a:* cómo el cliente **presenta** el diálogo de aprobación, que es de
 * su interfaz y no del contrato; y a si existe un conjunto de fases más rico
 * que el binario no expone como literal.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

/**
 * Los estados que el contrato exige, y sólo ésos.
 *
 * `awaitingApproval` es distinto de `planning` porque `ExitPlanMode` no
 * termina el modo: lo deja esperando al usuario. Colapsarlos haría que el
 * agente pudiera escribir en cuanto llama a la herramienta, que es exactamente
 * lo que el modo impide.
 */
export type PlanState = 'inactive' | 'planning' | 'awaitingApproval'

/** Las tres variantes de render que el binario distingue. */
export type PlanVariant = 'subagent' | 'sparse' | 'full'

export type PlanBackendOptions = {
  /** Raíz del proyecto; una `plansDir` relativa se resuelve contra ella. */
  projectRoot: string
  /** Dónde viven los archivos de plan. Sin ella, `~/.claude/plans/`. */
  plansDir?: string
}

/**
 * Resuelve dónde vive el archivo de plan de una sesión.
 *
 * Devuelve la ruta; **no** crea el archivo. Que exista o no es justo lo que
 * ramifica el mensaje de sistema, así que crearlo aquí borraría la distinción.
 */
export function planFilePath(sessionId: string, options: PlanBackendOptions): string {
  const configured = options.plansDir
  const dir = configured
    ? (isAbsolute(configured) ? configured : resolve(options.projectRoot, configured))
    : join(homedir(), '.claude', 'plans')
  return join(dir, `${sessionId}.md`)
}

/**
 * El mensaje de sistema del modo, con su ramificación por existencia.
 *
 * Se porta la estructura, no el texto literal del binario: el texto es suyo y
 * este harness escribe en español (`redaccion-tecnica-es.md`). Lo que sí se
 * porta verbatim es **qué afirma**: prohibición de escribir, el archivo como
 * única excepción, y la obligación de cerrar con la herramienta de salida.
 */
export function planModeInstructions(path: string, extraWritablePath?: string): string {
  const alsoWritable = extraWritablePath
    ? `, además del documento de taller de la sesión (${extraWritablePath})`
    : ''
  const branch = existsSync(path)
    ? `Ya existe un archivo de plan en ${path}. Puedes leerlo y editarlo de forma incremental.`
    : `Todavía no existe archivo de plan. Crea el tuyo en ${path}.`
  return [
    'Plan mode está activo. El usuario indicó que todavía NO quieres que ejecutes:',
    'no hagas ediciones ni ejecutes herramientas que no sean de sólo lectura.',
    `La única excepción es el archivo de plan (${path})${alsoWritable}.`,
    branch,
    'Cuando el plan esté listo, llama a ExitPlanMode para indicar que terminaste.',
  ].join(' ')
}

/**
 * Render del plan en la variante que corresponda.
 *
 * `subagent` va sin encabezado —el padre ya lo enmarca—, `sparse` recorta a las
 * líneas con contenido, y `full` entrega el texto tal cual.
 */
export function renderPlan(text: string, variant: PlanVariant): string {
  if (variant === 'subagent') return text.trim()
  if (variant === 'sparse') {
    return text.split('\n').filter((l) => l.trim() !== '').join('\n')
  }
  return text
}

/** La variante que toca, derivada del contexto — no elegida a mano. */
export function planVariantFor(options: { agentId?: string; sparse?: boolean }): PlanVariant {
  if (options.agentId) return 'subagent'
  return options.sparse ? 'sparse' : 'full'
}

/**
 * El modo vivo de una sesión: su estado, su archivo, y la puerta que impone.
 *
 * No persiste el estado: vive lo que vive la sesión. Lo durable es el archivo,
 * que es justamente lo que sobrevive a un reinicio y lo que `ExitPlanMode` lee.
 */
export class PlanMode {
  private state: PlanState = 'inactive'
  readonly path: string

  constructor(sessionId: string, private readonly options: PlanBackendOptions) {
    this.path = planFilePath(sessionId, options)
  }

  current(): PlanState {
    return this.state
  }

  active(): boolean {
    return this.state !== 'inactive'
  }

  /** Entra al modo. Idempotente: entrar dos veces no reinicia nada. */
  enter(): PlanState {
    if (this.state === 'inactive') this.state = 'planning'
    return this.state
  }

  /**
   * Señala que el plan está listo. NO sale del modo.
   *
   * Rehúsa si el archivo no existe o está vacío: `ExitPlanMode` lee del
   * archivo, así que sin contenido la señal no tiene qué presentar y el
   * usuario aprobaría un plan vacío.
   */
  requestApproval(): { ok: boolean; reason?: string; plan?: string } {
    if (this.state === 'inactive') {
      return { ok: false, reason: 'plan mode no está activo' }
    }
    if (!existsSync(this.path)) {
      return { ok: false, reason: `no existe el archivo de plan (${this.path}); escríbelo antes de salir` }
    }
    const plan = readFileSync(this.path, 'utf8')
    if (plan.trim() === '') {
      return { ok: false, reason: `el archivo de plan (${this.path}) está vacío` }
    }
    this.state = 'awaitingApproval'
    return { ok: true, plan }
  }

  /** El usuario aprobó: el modo termina y la escritura vuelve a estar abierta. */
  approve(): PlanState {
    this.state = 'inactive'
    return this.state
  }

  /** El usuario rechazó: vuelve a planificar, no a ejecutar. */
  reject(): PlanState {
    if (this.state === 'awaitingApproval') this.state = 'planning'
    return this.state
  }

  /** Crea el directorio del plan y escribe. Sólo para uso del propio modo. */
  write(text: string): void {
    mkdirSync(join(this.path, '..'), { recursive: true })
    writeFileSync(this.path, text)
  }
}

/**
 * La cuarta capa de la puerta: qué deja pasar el modo.
 *
 * Devuelve `undefined` cuando el modo no opina —y entonces decide la puerta
 * normal— y un veredicto con **su regla nombrada** cuando deniega. Un `deny`
 * anónimo es inexplicable para quien lo recibe, que es el criterio que
 * `permission.ts` ya fija para sus tres capas.
 */
export function planModeVerdict(
  mode: PlanMode | undefined,
  capability: 'read' | 'write' | 'execute',
  target: string,
): { decision: 'deny'; rule: string; reason: string } | undefined {
  if (!mode?.active()) return undefined
  if (capability === 'read') return undefined
  if (capability === 'write' && target !== '' && resolve(target) === resolve(mode.path)) {
    return undefined
  }
  return {
    decision: 'deny',
    rule: 'planMode',
    reason: capability === 'write'
      ? `plan mode: el archivo de plan (${mode.path}) es el único editable`
      : 'plan mode: sólo herramientas de sólo lectura hasta que el plan se apruebe',
  }
}
