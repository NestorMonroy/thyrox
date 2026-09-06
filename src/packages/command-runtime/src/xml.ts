/**
 * Porte COMPLETO de `ccnmt: packages/command-runtime/src/xml.ts` — sus 34
 * exportaciones, ninguna omitida.
 *
 * Las cadenas se reproducen VERBATIM porque su valor ES el contrato: una
 * etiqueta es lo que el modelo lee en el mensaje, y el receptor la busca por
 * su literal. Reescribirla con otra grafia no seria una adaptacion: seria un
 * protocolo distinto que no interopera con nada.
 */

// Nombres de etiqueta XML con que se marca la metadata de skill/comando dentro
// de un mensaje.
export const COMMAND_NAME_TAG = 'command-name'
export const COMMAND_MESSAGE_TAG = 'command-message'
export const COMMAND_ARGS_TAG = 'command-args'

// Etiquetas de entrada y salida de terminal dentro de un mensaje de usuario.
// Envuelven contenido que representa actividad de terminal, no lo que la
// persona tecleo.
export const BASH_INPUT_TAG = 'bash-input'
export const BASH_STDOUT_TAG = 'bash-stdout'
export const BASH_STDERR_TAG = 'bash-stderr'
export const LOCAL_COMMAND_STDOUT_TAG = 'local-command-stdout'
export const LOCAL_COMMAND_STDERR_TAG = 'local-command-stderr'
export const LOCAL_COMMAND_CAVEAT_TAG = 'local-command-caveat'

// Todas las etiquetas de terminal: su presencia marca el mensaje como salida
// de terminal y no como prompt de la persona.
export const TERMINAL_OUTPUT_TAGS = [
  BASH_INPUT_TAG,
  BASH_STDOUT_TAG,
  BASH_STDERR_TAG,
  LOCAL_COMMAND_STDOUT_TAG,
  LOCAL_COMMAND_STDERR_TAG,
  LOCAL_COMMAND_CAVEAT_TAG,
] as const

export const TICK_TAG = 'tick'

// Etiquetas de la notificacion de tarea (terminacion de un trabajo en segundo
// plano).
export const TASK_NOTIFICATION_TAG = 'task-notification'
export const TASK_ID_TAG = 'task-id'
export const TOOL_USE_ID_TAG = 'tool-use-id'
export const TASK_TYPE_TAG = 'task-type'
export const OUTPUT_FILE_TAG = 'output-file'
export const STATUS_TAG = 'status'
export const SUMMARY_TAG = 'summary'
export const REASON_TAG = 'reason'
export const WORKTREE_TAG = 'worktree'
export const WORKTREE_PATH_TAG = 'worktreePath'
export const WORKTREE_BRANCH_TAG = 'worktreeBranch'

// Etiqueta del modo ultraplan (sesiones remotas de planeacion en paralelo).
export const ULTRAPLAN_TAG = 'ultraplan'

// Etiqueta del resultado de un /review remoto (la salida de la sesion de
// revision teleportada). La sesion remota envuelve ahi su revision final; el
// consultor local la extrae.
export const REMOTE_REVIEW_TAG = 'remote-review'

// El latido de run_hunt.sh replica el progress.json del orquestador dentro de
// esta etiqueta cada ~10 s. El consultor local lee el ultimo para la linea de
// estado de la tarea.
export const REMOTE_REVIEW_PROGRESS_TAG = 'remote-review-progress'

// Etiqueta del mensaje entre pares de un swarm.
export const TEAMMATE_MESSAGE_TAG = 'teammate-message'

// Etiqueta del mensaje que llega por un canal externo.
export const CHANNEL_MESSAGE_TAG = 'channel-message'
export const CHANNEL_TAG = 'channel'

// Etiqueta del mensaje UDS entre sesiones (el buzon de otra sesion de Claude).
export const CROSS_SESSION_MESSAGE_TAG = 'cross-session-message'

// Etiqueta que envuelve el texto fijo de reglas y formato en el primer mensaje
// de un hijo de fork. Permite al renderizador del transcript plegarlo y mostrar
// solo la directiva.
export const FORK_BOILERPLATE_TAG = 'fork-boilerplate'
// Prefijo delante del texto de la directiva, que el renderizador retira. Se
// mantiene sincronizado entre buildChildMessage (que lo genera) y
// UserForkBoilerplateMessage (que lo analiza).
export const FORK_DIRECTIVE_PREFIX = 'Your directive: '

// Formas de argumento con que un comando slash pide ayuda.
export const COMMON_HELP_ARGS = ['help', '-h', '--help']

// Formas de argumento con que un comando slash pide el estado actual.
export const COMMON_INFO_ARGS = [
  'list',
  'show',
  'display',
  'current',
  'view',
  'get',
  'check',
  'describe',
  'print',
  'version',
  'about',
  'status',
  '?',
]

/**
 * Construye la metadata de command-message de un skill que se esta cargando.
 *
 * Vive aqui —junto a las constantes COMMAND_*_TAG— para que quien llame desde
 * otro paquete pueda usarla sin cargar con el resto de la superficie de
 * processSlashCommand.tsx: eso es lo que cerro el componente fuertemente
 * conexo de cuatro archivos AgentTool/runAgent <-> processSlashCommand.
 */
export function formatSkillLoadingMetadata(skillName: string): string {
  return [
    `<${COMMAND_MESSAGE_TAG}>${skillName}</${COMMAND_MESSAGE_TAG}>`,
    `<${COMMAND_NAME_TAG}>${skillName}</${COMMAND_NAME_TAG}>`,
    `<skill-format>true</skill-format>`,
  ].join('\n')
}
