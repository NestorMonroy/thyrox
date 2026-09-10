/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/progressTypes.ts` (TASK #232, porte de
 * `tool-registry`). Sin dependencias.
 *
 * Tipos del progreso de una herramienta — unión discriminada sobre el
 * campo `type`.
 *
 * Historia: todos estos eran `unknown` (placeholders de descompilación) —
 * ver V9-2b en `docs/refactor/v9-deps-shrinkpath.md` de la fuente. Las
 * formas reales siempre estuvieron presentes en los sitios de construcción,
 * dentro de la llamada `onProgress({...})` de cada herramienta, pero el
 * lado de tipos se había ensanchado a `unknown`, produciendo TS2339 en
 * cada consumidor que accedía a `progress.campo`. V9-2b (2026-05-04 en la
 * fuente) angosta el lado de tipos para que coincida con la realidad del
 * lado de construcción.
 *
 * Cada tipo de progreso es el cuerpo que se pasa dentro de
 * `onProgress({ data: T })` — NO incluye el sobre `{ toolUseID, data }`;
 * ése es el `ToolCallProgress` de `Tool.ts`.
 */

/**
 * Cuerpo del evento de progreso de BashTool.
 * Se construye en `packages/tool-registry/src/tools/BashTool/BashTool.tsx:900`
 * de la fuente (`.tsx` bloqueado por ausencia de `@anthropic/ink`; el tipo
 * se porta igual porque otros consumidores sí lo necesitan).
 */
export type BashProgress = {
  type: 'bash_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  taskId?: string
  timeoutMs?: number
}

/**
 * Cuerpo del evento de progreso de PowerShellTool. Misma forma que
 * `BashProgress` salvo el discriminador `type`. Se construye en
 * `PowerShellTool.tsx:637-647` de la fuente.
 */
export type PowerShellProgress = {
  type: 'powershell_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  taskId?: string
  timeoutMs?: number
}

/**
 * `ShellProgress` es la unión que emiten ambas herramientas de shell. La
 * usa el componente `BashModeProgress` del REPL (y `processBashCommand.tsx`)
 * para renderizar una UI de progreso compartida entre bash y powershell.
 */
export type ShellProgress = BashProgress | PowerShellProgress

/**
 * Cuerpo del evento de progreso de MCPTool. Se construye en
 * `mcp-runtime/clientRuntime.ts:2918-2924` de la fuente (reenvía las
 * notificaciones de progreso del SDK).
 */
export type MCPProgress = {
  type: 'mcp_progress'
  status: 'progress'
  serverName: string
  toolName: string
  /** Opcional — indefinido cuando el servidor omite un conteo de progreso. */
  progress?: number
  /** Total opcional — indefinido cuando el servidor no reporta un total. */
  total?: number
  /** Mensaje de progreso legible por humanos, opcional. */
  progressMessage?: string
}

/**
 * El resto de los tipos de progreso de herramienta se mantienen como
 * placeholders `unknown`. Cada uno exige, o angostar el campo interno
 * `message` (Agent/SkillTool — ver V9-2b iter-19 de la fuente sobre por qué
 * este alcance se amplió: `AgentToolProgress.message` es una unión
 * `NormalizedMessage`, angostarla se propaga a 30+ dependencias de forma de
 * mensaje), o leer de adaptadores externos (WebSearch). Se difiere.
 */
export type AgentToolProgress = unknown
export type SkillToolProgress = unknown
export type REPLToolProgress = unknown
export type TaskOutputProgress = unknown
export type WebSearchProgress = unknown
export type SdkWorkflowProgress = unknown

/**
 * Unión de nivel superior sobre el cuerpo del evento de progreso de cada
 * herramienta. Debilitada por ahora a `unknown` porque los miembros de la
 * unión todavía son en parte placeholders; angostar cuando se angosten más
 * tipos de progreso.
 */
export type ToolProgressData = unknown
