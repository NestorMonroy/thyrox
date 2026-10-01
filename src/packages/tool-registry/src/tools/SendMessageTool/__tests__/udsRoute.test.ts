/**
 * El ramal `uds:` de `SendMessage` (TASK-THYROX-0449): `to: "uds:<socket>"`
 * con texto plano llega a `sendToUdsSocket` y el par recibe el marco `user`.
 * Es la mitad de `deliver` de `chunk-zzjp4jq7.js` (2.1.283) que
 * `SendMessageTool.ts:568` porta: `import.meta.require(chunk-p4b2d9hd).sendToUdsSocket`.
 *
 * AISLAMIENTO DE BANDERA (mismo idioma que
 * `app-host/src/runtime/__tests__/messagingInboxAtLaunch.test.ts`). Este
 * archivo se corre DOS veces: sin bandera (`bun test`), donde el ramal no
 * existe y lo único medible es que `validateInput` NO toma el atajo `uds:`;
 * y con ella (`bun test --feature=UDS_INBOX`), donde `call` se conecta a un
 * socket real de escucha creado con `mkdtemp`. `feature()` sólo se lee
 * directo en un `if`/ternario, así que su valor decide qué rama corre.
 *
 * Métrica: las líneas que un servidor UDS local recibe cuando `call`
 * despacha, y el veredicto de `validateInput` sobre la misma entrada.
 * Ciega a: el permiso (`checkPermissions` no se invoca), el recibo del par
 * (`peer_message_status`) y la compuerta `Ws` de la referencia, que
 * `SendMessageTool.ts` todavía no porta.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { feature } from 'bun:bundle'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SendMessageTool, type Input } from '../SendMessageTool.ts'

type CallResult = { data: { success: boolean; message: string } }
type CallFunction = (input: Input, context: object, canUseTool: unknown, assistantMessage: unknown) => Promise<CallResult>
type ValidateFunction = (input: Input, context: object) => Promise<{ result: boolean; message?: string }>

const call = SendMessageTool.call as unknown as CallFunction
const validateInput = SendMessageTool.validateInput as unknown as ValidateFunction
const context = {}
const canUseTool = () => Promise.resolve({ behavior: 'allow' })

let dir: string | undefined
let server: Server | undefined
let socketPath = ''
let receivedLines: string[] = []

async function listen(): Promise<void> {
  server = createServer(socket => {
    socket.on('data', chunk => {
      receivedLines.push(...chunk.toString('utf8').split('\n').filter(line => line.length > 0))
    })
    socket.on('error', () => {})
  })
  await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
}

/** El servidor recibe por eventos; el envío ya resolvió, así que basta ceder un turno del event loop. */
async function settle(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 20))
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'send-uds-'))
  socketPath = join(dir, 'peer.sock')
  receivedLines = []
  await listen()
})

afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()))
  server = undefined
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

if (!feature('UDS_INBOX')) {
  describe('SendMessage a uds:<socket> — sin feature(UDS_INBOX)', () => {
    test('validateInput no toma el atajo uds: y deriva el summary como con cualquier nombre', async () => {
      const input: Input = { to: `uds:${socketPath}`, message: 'hola par' }
      const verdict = await validateInput(input, context)
      expect(verdict.result).toBe(true)
      expect(input.summary).toBe('hola par')
    })

    test('un mensaje estructurado a uds: no se rechaza como cross-session (el ramal no existe)', async () => {
      const verdict = await validateInput({ to: `uds:${socketPath}`, message: { type: 'shutdown_request', reason: 'x' } }, context)
      expect(verdict.message ?? '').not.toContain('cross-session')
    })
  })
} else {
  describe('SendMessage a uds:<socket> — con feature(UDS_INBOX)', () => {
    test('validateInput acepta texto plano sin summary y no lo deriva', async () => {
      const input: Input = { to: `uds:${socketPath}`, message: 'hola par' }
      const verdict = await validateInput(input, context)
      expect(verdict.result).toBe(true)
      expect(input.summary).toBeUndefined()
    })

    test('validateInput rechaza un mensaje estructurado a uds:', async () => {
      const verdict = await validateInput({ to: `uds:${socketPath}`, message: { type: 'shutdown_request', reason: 'x' } }, context)
      expect(verdict.result).toBe(false)
      expect(verdict.message).toContain('structured messages cannot be sent cross-session')
    })

    test('call llega a sendToUdsSocket: el par recibe un marco user con el texto', async () => {
      const outcome = await call({ to: `uds:${socketPath}`, message: 'hola par' }, context, canUseTool, undefined)
      await settle()
      expect(outcome.data.success).toBe(true)
      expect(outcome.data.message).toBe(`“hola par” → uds:${socketPath}`)
      expect(receivedLines.length).toBe(1)
      const frame = JSON.parse(receivedLines[0]!)
      expect(frame.type).toBe('user')
      expect(frame.message.role).toBe('user')
      expect(frame.message.content).toContain('hola par')
      expect(typeof frame.msg_id).toBe('string')
    })

    test('call con summary explícito lo usa como preview', async () => {
      const outcome = await call({ to: `uds:${socketPath}`, message: 'un texto largo', summary: 'resumen' }, context, canUseTool, undefined)
      expect(outcome.data.message).toBe(`“resumen” → uds:${socketPath}`)
    })

    test('un socket sin oyente devuelve success:false con la causa, sin lanzar', async () => {
      const dead = join(dir!, 'nadie.sock')
      const outcome = await call({ to: `uds:${dead}`, message: 'hola' }, context, canUseTool, undefined)
      expect(outcome.data.success).toBe(false)
      expect(outcome.data.message).toStartWith(`Failed to send to uds:${dead}:`)
      expect(receivedLines).toEqual([])
    })
  })
}
