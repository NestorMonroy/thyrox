/**
 * TASK-THYROX-0673 — `SendMessage` y `ListAgents` en el bucle de `thyrox -p`.
 *
 * Los adaptadores traducen las herramientas de `@thyrox/tool-registry` al
 * contrato `Tool` del bucle (`@thyrox/agent/loop/types`). Sólo se ofrecen
 * cuando el buzón de esta sesión arrancó: la señal es
 * `THYROX_CODE_MESSAGING_SOCKET`, que el buzón exporta al enlazar su socket.
 *
 * Se corre con `bun test --feature=UDS_INBOX`: sin la bandera el ramal
 * `uds:` de `SendMessageTool` no existe y el buzón no arranca nunca, así que
 * la mitad de envío sólo se mide con ella; sin ella se miden la compuerta y
 * la forma de las herramientas.
 *
 * Métrica: la lista de herramientas por entorno, los marcos que un socket de
 * escucha real recibe y el `ToolResult` de cada llamada.
 * Ciega a: la recepción en otro proceso (la mide
 * `tests/session/test-send-message-two-cli.sh`).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { feature } from 'bun:bundle'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Tool, ToolContext } from '@thyrox/agent/loop/types'
import { LIST_AGENTS_TOOL_NAME, SEND_MESSAGE_TOOL_NAME, peerMessagingTools } from '../src/entry/peerMessagingTools.ts'

const LIVE_INBOX_ENV = { THYROX_CODE_MESSAGING_SOCKET: '/nonexistent/own.sock' }
const context: ToolContext = { cwd: '/', sessionId: 'test', abort: new AbortController().signal, messages: [] }

function toolNamed(tools: Tool[], name: string): Tool {
  const found = tools.find(tool => tool.name === name)
  if (found === undefined) throw new Error(`falta la herramienta ${name}`)
  return found
}

let dir = ''
let server: Server | undefined
let socketPath = ''
let receivedLines: string[] = []

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'peer-messaging-tools-'))
  socketPath = join(dir, 'peer.sock')
  receivedLines = []
  server = createServer(socket => {
    socket.on('data', chunk => receivedLines.push(...chunk.toString('utf8').split('\n').filter(line => line.length > 0)))
    socket.on('error', () => {})
  })
  await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
})

afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()))
  server = undefined
  rmSync(dir, { recursive: true, force: true })
})

describe('peerMessagingTools — la compuerta del buzón', () => {
  test('sin THYROX_CODE_MESSAGING_SOCKET no se ofrece ninguna herramienta', () => {
    expect(peerMessagingTools({})).toEqual([])
  })

  test('con el buzón activo se ofrecen SendMessage y ListAgents', () => {
    expect(peerMessagingTools(LIVE_INBOX_ENV).map(tool => tool.name)).toEqual([SEND_MESSAGE_TOOL_NAME, LIST_AGENTS_TOOL_NAME])
  })

  test('SendMessage declara to y message obligatorios, texto plano', () => {
    const schema = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), SEND_MESSAGE_TOOL_NAME).input_schema
    expect(schema.required).toEqual(['to', 'message'])
    expect((schema.properties.message as { type: string }).type).toBe('string')
  })

  test('ListAgents es de lectura y SendMessage de ejecución', () => {
    const tools = peerMessagingTools(LIVE_INBOX_ENV)
    expect(toolNamed(tools, LIST_AGENTS_TOOL_NAME).permission).toBe('read')
    expect(toolNamed(tools, SEND_MESSAGE_TOOL_NAME).permission).toBe('execute')
  })
})

describe('SendMessage — direcciones que no son de otra sesión', () => {
  test('un nombre de compañero se rechaza sin enviar nada', async () => {
    const send = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), SEND_MESSAGE_TOOL_NAME)
    const result = await send.run({ to: 'researcher', message: 'hola' }, context)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('uds:<socket>')
    expect(receivedLines).toEqual([])
  })

  test('un mensaje que no es texto se rechaza sin enviar nada', async () => {
    const send = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), SEND_MESSAGE_TOOL_NAME)
    const result = await send.run({ to: `uds:${socketPath}`, message: { type: 'shutdown_request' } }, context)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('plain text')
    expect(receivedLines).toEqual([])
  })
})

if (feature('UDS_INBOX')) {
  describe('SendMessage a uds:<socket> — con feature(UDS_INBOX)', () => {
    test('el par recibe un marco user con el texto, y el resultado lo confirma', async () => {
      const send = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), SEND_MESSAGE_TOOL_NAME)
      const result = await send.run({ to: `uds:${socketPath}`, message: 'hola par' }, context)
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(result.isError).toBe(false)
      expect(result.content).toBe(`“hola par” → uds:${socketPath}`)
      expect(receivedLines.length).toBe(1)
      const frame = JSON.parse(receivedLines[0]!) as { type: string; message: { content: string } }
      expect(frame.type).toBe('user')
      expect(frame.message.content).toContain('hola par')
    })

    test('un socket sin oyente es un error con la causa, sin lanzar', async () => {
      const send = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), SEND_MESSAGE_TOOL_NAME)
      const dead = join(dir, 'nobody.sock')
      const result = await send.run({ to: `uds:${dead}`, message: 'hola' }, context)
      expect(result.isError).toBe(true)
      expect(result.content).toStartWith(`Failed to send to uds:${dead}:`)
    })

    test('bridge: sin Remote Control conectado se rechaza con el motivo de la referencia', async () => {
      const send = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), SEND_MESSAGE_TOOL_NAME)
      const result = await send.run({ to: 'bridge:session_x', message: 'hola' }, context)
      expect(result.isError).toBe(true)
      expect(result.content).toContain('Remote Control is not connected')
    })
  })
}

describe('ListAgents', () => {
  test('con la mensajería apagada devuelve el aviso de la referencia', async () => {
    const previous = process.env.THYROX_CODE_HARBOR_KITE
    process.env.THYROX_CODE_HARBOR_KITE = '0'
    try {
      const list = toolNamed(peerMessagingTools(LIVE_INBOX_ENV), LIST_AGENTS_TOOL_NAME)
      const result = await list.run({}, context)
      expect(result.isError).toBe(false)
      expect(result.content).toStartWith('Cross-session messaging is switched off in this session right now')
    } finally {
      if (previous === undefined) delete process.env.THYROX_CODE_HARBOR_KITE
      else process.env.THYROX_CODE_HARBOR_KITE = previous
    }
  })
})
