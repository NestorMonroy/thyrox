/**
 * El útil que SIEMPRE abre un diálogo de permiso. Sólo para pruebas.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/testing/
 * TestingPermissionTool.tsx` (1 símbolo exportado). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se
 * copia.
 *
 * EXISTE PARA QUE LA SUITE DE EXTREMO A EXTREMO TENGA UN DIÁLOGO QUE
 * EJERCITAR. Su `checkPermissions` no tiene rama de `allow`: no es una
 * omisión, es su acto. Y por eso `isEnabled` lo ata a `NODE_ENV === 'test'`
 * —sin esa guarda, un útil cuyo único efecto es interrumpir a la persona
 * aparecería en una sesión real.
 *
 * LA EXTENSIÓN `.tsx` NO IMPLICA REACT. Medido sobre la fuente: **0**
 * ocurrencias de `react`, y sus cuatro importaciones son `zod`, `Tool.js` y
 * `lazySchema.js`. Se conserva la extensión para que la comparación archivo
 * a archivo con la fuente no se descoloque; el bloqueo transversal de react
 * que gobierna a ~25 módulos de este paquete no le aplica.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { z } from 'zod/v4'
import type { Tool } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const NAME = 'TestingPermission'

const inputSchema = lazySchema(() => z.strictObject({}))
type InputSchema = ReturnType<typeof inputSchema>

export const TestingPermissionTool: Tool<InputSchema, string> = buildTool({
  name: NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Test tool that always asks for permission'
  },
  async prompt() {
    return 'Test tool that always asks for permission before executing. Used for end-to-end testing.'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  userFacingName() {
    return 'TestingPermission'
  },
  // La guarda: fuera de una corrida de pruebas el útil no existe.
  isEnabled() {
    return process.env.NODE_ENV === 'test'
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  async checkPermissions() {
    // Sin rama de `allow`: pedir permiso ES lo que este útil hace.
    return {
      behavior: 'ask' as const,
      message: `Run test?`,
    }
  },
  // Las seis superficies devuelven `null`: el útil no tiene nada que
  // mostrar, y un render vacío ensuciaría el transcript de la suite.
  renderToolUseMessage() {
    return null
  },
  renderToolUseProgressMessage() {
    return null
  },
  renderToolUseQueuedMessage() {
    return null
  },
  renderToolUseRejectedMessage() {
    return null
  },
  renderToolResultMessage() {
    return null
  },
  renderToolUseErrorMessage() {
    return null
  },
  async call() {
    return {
      data: `${NAME} executed successfully`,
    }
  },
  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      type: 'tool_result',
      content: String(result),
      tool_use_id: toolUseID,
    }
  },
} satisfies ToolDef<InputSchema, string>)
