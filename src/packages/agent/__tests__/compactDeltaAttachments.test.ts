/**
 * Las piezas de `attachments.ts` que `compaction/compact.ts` consume y que
 * este árbol no tenía (`ccnmt: packages/agent/attachments.ts`), medidas de
 * verdad: `getMcpInstructionsDeltaAttachment` (:1661) y
 * `generateFileAttachment` (:3121). Las otras dos —
 * `getAgentListingDeltaAttachment` (:1592) y
 * `getDeferredToolsDeltaAttachment` (:1557)— quedan PARCIALES por
 * dependencias fuera del alcance del porte (ver la cabecera de
 * `attachments.ts`) y no se miden aquí: un test sobre un cuerpo que sólo
 * devuelve `[]` no discriminaría nada.
 *
 * El delta MCP se mide con su gate abierto por variable de entorno —la
 * misma palanca que la fuente lee— y con la reconstrucción de lo ya
 * anunciado a partir de adjuntos previos, que es la mitad que carga el
 * peso: sin ella cada compactación reanunciaría todo.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAttachmentMessage, generateFileAttachment, getMcpInstructionsDeltaAttachment } from '../attachments.ts'
import type { Message } from '../messageShapes.ts'
import { FileStateCache } from '@thyrox/tool-registry/fileStateCache'
import { FileReadTool } from '@thyrox/tool-registry/tools/FileReadTool/FileReadTool.js'
import { getEmptyToolPermissionContext, type Tools, type ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import type { AppState } from '@thyrox/app-host/state/AppState'
import type { MCPServerConnection } from '@thyrox/mcp-runtime/types.js'

const announced = (attachment: { type: string; [key: string]: unknown }): Message =>
  createAttachmentMessage(attachment)

const savedEnv: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of ['CLAUDE_CODE_MCP_INSTR_DELTA']) {
    savedEnv[key] = process.env[key]
  }
})
afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('getMcpInstructionsDeltaAttachment', () => {
  const connected = (name: string, instructions?: string): MCPServerConnection =>
    ({ type: 'connected', name, instructions }) as MCPServerConnection

  test('con el gate cerrado no anuncia nada', () => {
    process.env.CLAUDE_CODE_MCP_INSTR_DELTA = 'false'
    expect(getMcpInstructionsDeltaAttachment([connected('srv', 'haz x')], [], 'claude-opus-5', [])).toEqual([])
  })

  test('un servidor conectado con instrucciones se anuncia una vez', () => {
    process.env.CLAUDE_CODE_MCP_INSTR_DELTA = 'true'
    const [delta] = getMcpInstructionsDeltaAttachment([connected('srv', 'haz x')], [], 'claude-opus-5', [])
    expect(delta).toMatchObject({
      type: 'mcp_instructions_delta',
      addedNames: ['srv'],
      addedBlocks: ['## srv\nhaz x'],
      removedNames: [],
    })
  })

  test('lo que el historial ya anunció no se repite', () => {
    process.env.CLAUDE_CODE_MCP_INSTR_DELTA = 'true'
    const history = [announced({ type: 'mcp_instructions_delta', addedNames: ['srv'], removedNames: [] })]
    expect(
      getMcpInstructionsDeltaAttachment([connected('srv', 'haz x')], [], 'claude-opus-5', history),
    ).toEqual([])
  })
})

describe('generateFileAttachment', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'thyrox-file-attachment-'))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  function fileContext(denyRules: string[] = []): ToolUseContext {
    const permission = { ...getEmptyToolPermissionContext(), alwaysDenyRules: { userSettings: denyRules } }
    // Sólo el campo que el adjunto lee; la aserción declara la anchura, no la rellena.
    const appState = { toolPermissionContext: permission } as AppState
    const tools: Tools = []
    const context = {
      abortController: new AbortController(),
      readFileState: new FileStateCache(100, 1_000_000),
      getAppState: () => appState,
      options: { tools },
    }
    return context as ToolUseContext
  }

  test('en modo compact devuelve el archivo leído con su contenido y su ruta', async () => {
    const path = join(dir, 'nota.txt')
    writeFileSync(path, 'primera línea\nsegunda línea\n')
    const attachment = await generateFileAttachment(path, fileContext(), 'ok_event', 'error_event', 'compact')
    expect(attachment).toMatchObject({ type: 'file', filename: path })
    if (attachment?.type !== 'file') throw new Error('se esperaba un adjunto de archivo')
    const content = attachment.content
    expect(content.type).toBe('text')
    if (content.type !== 'text') throw new Error('se esperaba contenido de texto')
    expect(content.file.content).toContain('primera línea')
  })

  test('un archivo con regla de denegación de lectura no se adjunta, y ni siquiera llega a FileReadTool', async () => {
    // FileReadTool.validateInput aplica la misma regla (FileReadTool.ts:446),
    // así que el resultado solo no discrimina: lo que mide el corte temprano
    // es que la herramienta nunca se consulte.
    const validateInput = spyOn(FileReadTool, 'validateInput')
    try {
      const path = join(dir, 'secreto.txt')
      writeFileSync(path, 'no leer')
      const attachment = await generateFileAttachment(
        path,
        fileContext([`Read(/${dir}/**)`]),
        'ok_event',
        'error_event',
        'compact',
      )
      expect(attachment).toBeNull()
      expect(validateInput).toHaveBeenCalledTimes(0)
    } finally {
      validateInput.mockRestore()
    }
  })

  test('un archivo inexistente no se adjunta', async () => {
    const attachment = await generateFileAttachment(
      join(dir, 'no-existe.txt'),
      fileContext(),
      'ok_event',
      'error_event',
      'compact',
    )
    expect(attachment).toBeNull()
  })

  test('el uuid del mensaje que envuelve el adjunto es propio', () => {
    const message = createAttachmentMessage({ type: 'plan_file_reference', planFilePath: '/p', planContent: 'x' })
    expect(message.uuid).not.toBe(randomUUID())
    expect(message.attachment.type).toBe('plan_file_reference')
  })
})
