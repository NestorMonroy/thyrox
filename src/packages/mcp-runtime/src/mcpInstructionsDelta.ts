/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/mcpInstructionsDelta.ts`
 * — sus 3 exportaciones, ninguna omitida.
 *
 * Repuntado (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability` (`logEvent`). `isEnvTruthy` se toma de
 * `@thyrox/config/env/utils` (SÍ resuelve — porte parcial TASK-DOCS-0200,
 * y `isEnvTruthy` es uno de los tres símbolos que sí trae). `isEnvDefinedFalsy`
 * usa el sustituto local de `./internal/pendingCrossPackageDeps.ts` (no
 * está entre esos tres — mismo símbolo que `claudeai.ts` de este puerto
 * dejaba como especificador colgante antes de que se creara ese sustituto).
 *
 * Se dejan como especificadores colgantes (deuda documentada, filtro de
 * dos pasos — ninguno de los dos subpaths existe en el `exports` del
 * paquete correspondiente): `@claude-code-how-works/config/feature-flags`
 * (`getFeatureValue_CACHED_MAY_BE_STALE` — no está en `@thyrox/config`) y
 * `@claude-code-how-works/agent/messageShapes` (tipo `Message` — no está
 * en `@thyrox/agent`; queda como anotación de tipo, que Bun no evalúa en
 * runtime, así que no hace falta envolverla en `require()`).
 *
 * `getFeatureValue_CACHED_MAY_BE_STALE` se usa dentro del cuerpo de
 * `isMcpInstructionsDeltaEnabled`, nunca a nivel de módulo, así que se
 * envuelve con `require()` diferido — un `import` estático habría hecho
 * fallar la carga del módulo ENTERO (medido con `bun -e "import(...)"`
 * antes de esta corrección), no sólo esa función.
 */
import { logEvent } from '@thyrox/local-observability'
import type {
  ConnectedMCPServer,
  MCPServerConnection,
} from './types.js'
import type { Message } from '@claude-code-how-works/agent/messageShapes'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { isEnvDefinedFalsy } from './internal/pendingCrossPackageDeps.js'

function requireConfigFeatureFlags(): {
  getFeatureValue_CACHED_MAY_BE_STALE: <T>(flag: string, fallback: T) => T
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/config/feature-flags')
}

export type McpInstructionsDelta = {
  /** Nombres de servidor — para reconstrucción de escaneo sin estado. */
  addedNames: string[]
  /** Bloques renderizados "## {name}\n{instructions}" para addedNames. */
  addedBlocks: string[]
  removedNames: string[]
}

/**
 * Bloque de instrucciones escrito por el cliente, para anunciar cuando un
 * servidor se conecta, además de (o en vez de) las
 * `InitializeResult.instructions` propias del servidor. Permite que
 * servidores de primera parte (p. ej. claude-in-chrome) lleven contexto
 * del lado cliente que el propio servidor no conoce.
 */
export type ClientSideInstruction = {
  serverName: string
  block: string
}

/**
 * True → anuncia las instrucciones de servidor MCP vía attachments de
 * delta persistidos. False → prompts.ts conserva su
 * DANGEROUS_uncachedSystemPromptSection (se reconstruye cada turno; rompe
 * caché en conexión tardía).
 *
 * Override por variable de entorno para pruebas locales:
 * CLAUDE_CODE_MCP_INSTR_DELTA=true/false gana sobre el bypass de ant y
 * sobre el gate de GrowthBook.
 */
export function isMcpInstructionsDeltaEnabled(): boolean {
  if (isEnvTruthy(process.env.CLAUDE_CODE_MCP_INSTR_DELTA)) return true
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_MCP_INSTR_DELTA)) return false
  return (
    process.env.USER_TYPE === 'ant' ||
    requireConfigFeatureFlags().getFeatureValue_CACHED_MAY_BE_STALE(
      'tengu_basalt_3kr',
      false,
    )
  )
}

/**
 * Compara el conjunto actual de servidores MCP conectados que tienen
 * instrucciones (redactadas por el servidor vía InitializeResult, o
 * sintetizadas del lado cliente) contra lo que ya se anunció en esta
 * conversación. Null si nada cambió.
 *
 * Las instrucciones son inmutables durante la vida de una conexión (se
 * fijan una vez en el handshake), así que el escaneo compara por NOMBRE
 * de servidor, no por contenido.
 */
export function getMcpInstructionsDelta(
  mcpClients: MCPServerConnection[],
  messages: Message[],
  clientSideInstructions: ClientSideInstruction[],
): McpInstructionsDelta | null {
  const announced = new Set<string>()
  let attachmentCount = 0
  let midCount = 0
  for (const msg of messages) {
    if (msg.type !== 'attachment') continue
    attachmentCount++
    if (msg.attachment.type !== 'mcp_instructions_delta') continue
    midCount++
    // Los attachments mcp_instructions_delta llevan addedNames/removedNames;
    // el tipo común Message.attachment es { type: string; [key: string]:
    // unknown }, así que aquí se estrecha a la forma específica del delta.
    const delta = msg.attachment as unknown as {
      addedNames: string[]
      removedNames: string[]
    }
    for (const n of delta.addedNames) announced.add(n)
    for (const n of delta.removedNames) announced.delete(n)
  }

  const connected = mcpClients.filter(
    (c): c is ConnectedMCPServer => c.type === 'connected',
  )
  const connectedNames = new Set(connected.map(c => c.name))

  // Servidores con instrucciones que anunciar (por cualquiera de los dos
  // canales). Un servidor puede tener ambos: instrucciones del servidor +
  // un bloque del lado cliente anexado.
  const blocks = new Map<string, string>()
  for (const c of connected) {
    if (c.instructions) blocks.set(c.name, `## ${c.name}\n${c.instructions}`)
  }
  for (const ci of clientSideInstructions) {
    if (!connectedNames.has(ci.serverName)) continue
    const existing = blocks.get(ci.serverName)
    blocks.set(
      ci.serverName,
      existing
        ? `${existing}\n\n${ci.block}`
        : `## ${ci.serverName}\n${ci.block}`,
    )
  }

  const added: Array<{ name: string; block: string }> = []
  for (const [name, block] of blocks) {
    if (!announced.has(name)) added.push({ name, block })
  }

  // Un servidor previamente anunciado que ya no está conectado → removido.
  // No existe el caso "anunciado pero ahora sin instrucciones" para un
  // servidor que sigue conectado: InitializeResult es inmutable, y los
  // gates de instrucción del lado cliente son estables por sesión en la
  // práctica. (/model puede voltear el gate de modelo, pero
  // deferred_tools_delta tiene la misma propiedad y se trata el historial
  // como histórico — sin retractaciones retroactivas.)
  const removed: string[] = []
  for (const n of announced) {
    if (!connectedNames.has(n)) removed.push(n)
  }

  if (added.length === 0 && removed.length === 0) return null

  // Los mismos campos de diagnóstico que tengu_deferred_tools_pool_change
  // — el mismo bug de "el escaneo falla en producción", el mismo camino de
  // persistencia del attachment.
  logEvent('tengu_mcp_instructions_pool_change', {
    addedCount: added.length,
    removedCount: removed.length,
    priorAnnouncedCount: announced.size,
    clientSideCount: clientSideInstructions.length,
    messagesLength: messages.length,
    attachmentCount,
    midCount,
  })

  added.sort((a, b) => a.name.localeCompare(b.name))
  return {
    addedNames: added.map(a => a.name),
    addedBlocks: added.map(a => a.block),
    removedNames: removed.sort(),
  }
}
