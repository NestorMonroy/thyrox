/**
 * Puerto de `ccnmt: packages/tool-registry/src/constants.ts` (38 líneas,
 * 4 símbolos). Los cuatro conjuntos que acotan qué herramienta ve un agente
 * según el papel con que se lo despachó.
 *
 * SON DOS POLARIDADES, y la asimetría es deliberada:
 *
 *   NEGRA (se declara lo prohibido) — el agente normal. Hereda toda
 *       herramienta nueva por omisión, que es lo que se quiere: un agente
 *       trabaja con lo que la sesión tenga.
 *   BLANCA (se declara lo permitido) — el agente asíncrono y el
 *       coordinador. Nadie los mira mientras corren, así que una
 *       herramienta nueva NO les llega hasta que alguien la declare.
 *
 * Por qué `Task` está en la lista negra: es lo que hace que la profundidad
 * de anidamiento sea 1 y no infinita. Un agente que puede engendrar otro
 * agente puede engendrar un árbol, y el presupuesto de la sesión no lo
 * acota nadie.
 */

/** Lo que ningún agente puede hacer: cambiar la forma de la sesión que lo contiene. */
export const ALL_AGENT_DISALLOWED_TOOLS = new Set([
  'TaskOutput',
  'ExitPlanMode',
  'EnterPlanMode',
  'Task',
  'AskUserQuestion',
  'TaskStop',
])

/**
 * El agente declarado por el usuario en `.claude/agents/`. CONTIENE al
 * conjunto general en vez de repetirlo: si un día se añade un veto arriba y
 * aquí no se heredara, un agente a medida tendría más poder que uno interno.
 */
export const CUSTOM_AGENT_DISALLOWED_TOOLS = new Set([
  ...ALL_AGENT_DISALLOWED_TOOLS,
])

/** Lista BLANCA del agente asíncrono — corre sin nadie mirando. */
export const ASYNC_AGENT_ALLOWED_TOOLS = new Set([
  'Read',
  'WebSearch',
  'TodoWrite',
  'Grep',
  'WebFetch',
  'Glob',
  'Bash',
  'PowerShell',
  'Edit',
  'Write',
  'NotebookEdit',
  'Skill',
  'SyntheticOutput',
  'ToolSearch',
  'EnterWorktree',
  'ExitWorktree',
])

/**
 * Lista BLANCA del coordinador: cuatro verbos, y los cuatro son de despacho
 * o de mensaje. Un coordinador con `Bash` deja de coordinar y pasa a
 * ejecutar, que es el papel que reparte, no el que cumple.
 */
export const COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  'Task',
  'TaskStop',
  'SendMessage',
  'SyntheticOutput',
])
