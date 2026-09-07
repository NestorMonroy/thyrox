/**
 * Puerto FIEL y COMPLETO de la LÓGICA de
 * `ccnmt: packages/tool-registry/src/tools/MCPTool/MCPTool.ts` (TASK #232,
 * porte de `tool-registry`).
 *
 * `isOutputLineTruncated` viene del sustituto local
 * (`internal/pendingCrossPackageDeps.ts`) — ver su docstring.
 * `renderToolUseProgressMessage`/`renderToolResultMessage` (de `./UI.js`)
 * están BLOQUEADOS ahí (ver `MCPTool/UI.ts`), pero este archivo sólo
 * importa las referencias — no las invoca en tiempo de carga.
 */
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import type { PermissionResult } from '@thyrox/permission/PermissionResult'
import { isOutputLineTruncated } from '../../internal/pendingCrossPackageDeps.js'
import { DESCRIPTION, PROMPT } from './prompt.js'
import {
  renderToolResultMessage,
  renderToolUseMessage,
  renderToolUseProgressMessage,
} from './UI.js'

// Permite cualquier objeto de entrada, porque las herramientas MCP
// definen sus propios esquemas.
export const inputSchema = lazySchema(() => z.object({}).passthrough())
type InputSchema = ReturnType<typeof inputSchema>

export const outputSchema = lazySchema(() =>
  z.string().describe('MCP tool execution result'),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

// Re-exporta MCPProgress de los tipos centralizados, para romper ciclos de import.
export type { MCPProgress } from '../../progressTypes.js'

export const MCPTool = buildTool({
  isMcp: true,
  // Se sobreescribe en mcpClient.ts.
  isOpenWorld() {
    return false
  },
  // Se sobreescribe en mcpClient.ts con el nombre real de herramienta MCP + args.
  name: 'mcp',
  maxResultSizeChars: 100_000,
  // Se sobreescribe en mcpClient.ts.
  async description() {
    return DESCRIPTION
  },
  // Se sobreescribe en mcpClient.ts.
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  // Se sobreescribe en mcpClient.ts.
  async call() {
    return {
      data: '',
    }
  },
  async checkPermissions(): Promise<PermissionResult> {
    return {
      behavior: 'passthrough',
      message: 'MCPTool requires permission.',
    }
  },
  renderToolUseMessage,
  // Se sobreescribe en mcpClient.ts.
  userFacingName: () => 'mcp',
  renderToolUseProgressMessage,
  renderToolResultMessage,
  isResultTruncated(output: Output): boolean {
    return isOutputLineTruncated(output)
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
