/**
 * Porte de `ccnmt: packages/agent/__tests__/createMessageHelpers.test.ts`.
 *
 * Los constructores puros de mensaje corren en caminos calientes (comandos
 * slash, cambio de modelo, interrupcion de una herramienta). Un UUID mal
 * generado son claves duplicadas que revientan el reconciliador de React; una
 * etiqueta mal envuelta filtra el caveat al contexto del modelo como texto
 * plano al que el modelo «responde».
 */
import { describe, expect, test } from 'bun:test'
import {
  createModelSwitchBreadcrumbs,
  createProgressMessage,
  createSyntheticUserCaveatMessage,
  createToolResultStopMessage,
  formatCommandInputTags,
} from '../messages.ts'

describe('createSyntheticUserCaveatMessage', () => {
  test('devuelve un mensaje de usuario con el caveat envuelto en su etiqueta', () => {
    const m = createSyntheticUserCaveatMessage()
    expect(m.type).toBe('user')
    const content = m.message.content
    expect(typeof content).toBe('string')
    expect(content).toContain('local-command-caveat')
    expect(content).toContain('DO NOT respond')
  })

  test('isMeta=true — el caveat queda oculto en el transcript', () => {
    const m = createSyntheticUserCaveatMessage()
    expect(m.isMeta).toBe(true)
  })

  test('cada llamada da un UUID fresco (sin claves duplicadas de React)', () => {
    const a = createSyntheticUserCaveatMessage()
    const b = createSyntheticUserCaveatMessage()
    expect(a.uuid).not.toBe(b.uuid)
  })

  test('el contenido va envuelto en etiquetas, no en texto plano', () => {
    const m = createSyntheticUserCaveatMessage()
    const content = m.message.content as string
    expect(content.startsWith('<')).toBe(true)
    expect(content.endsWith('>')).toBe(true)
  })
})

describe('createModelSwitchBreadcrumbs — la miga al estilo de un comando slash', () => {
  test('devuelve 3 mensajes (caveat + comando + stdout)', () => {
    const r = createModelSwitchBreadcrumbs('opus', 'Claude Opus 4.7')
    expect(r).toHaveLength(3)
  })

  test('el primero es el caveat (isMeta=true)', () => {
    const [first] = createModelSwitchBreadcrumbs('opus', 'Claude Opus 4.7')
    expect(first?.isMeta).toBe(true)
  })

  test('el segundo contiene el comando de modelo', () => {
    const [, second] = createModelSwitchBreadcrumbs('opus', 'Claude Opus 4.7')
    expect(second?.message.content).toContain('/model')
    expect(second?.message.content).toContain('opus')
  })

  test('el tercero contiene el resolvedDisplay, en la etiqueta local-command-stdout', () => {
    const [, , third] = createModelSwitchBreadcrumbs('opus', 'Claude Opus 4.7')
    expect(third?.message.content).toContain('Claude Opus 4.7')
    expect(third?.message.content).toContain('local-command-stdout')
  })

  test('los 3 mensajes son de tipo user', () => {
    const r = createModelSwitchBreadcrumbs('opus', 'Display')
    for (const m of r) {
      expect(m.type).toBe('user')
    }
  })

  test('los 3 mensajes tienen UUID distinto', () => {
    const r = createModelSwitchBreadcrumbs('opus', 'Display')
    const uuids = r.map(m => m.uuid)
    expect(new Set(uuids).size).toBe(3)
  })

  test('no escapa nada — modelArg se interpola tal cual en la etiqueta del comando', () => {
    // Documentado: sin saneo tipo XSS; quien llama es de confianza (CLI/SDK).
    const r = createModelSwitchBreadcrumbs(
      'opus<script>',
      'evil"display',
    )
    const content = r[1]?.message.content as string
    expect(content).toContain('opus<script>') // insertado verbatim
  })
})

describe('createProgressMessage', () => {
  test('devuelve un mensaje de progreso con el toolUseID y la data dados', () => {
    const m = createProgressMessage({
      toolUseID: 'tu_1',
      parentToolUseID: 'tu_parent',
      data: { type: 'bash', stdout: 'hello' } as never,
    })
    expect(m.type).toBe('progress')
    expect(m.toolUseID).toBe('tu_1')
    expect(m.parentToolUseID).toBe('tu_parent')
    expect(m.data).toEqual({ type: 'bash', stdout: 'hello' })
  })

  test('uuid y timestamp se autogeneran', () => {
    const m = createProgressMessage({
      toolUseID: 'tu_1',
      parentToolUseID: 'tu_parent',
      data: {} as never,
    })
    expect(m.uuid).toBeDefined()
    expect(typeof m.uuid).toBe('string')
    expect(m.timestamp).toBeDefined()
    expect(typeof m.timestamp).toBe('string')
  })

  test('el timestamp va en formato ISO', () => {
    const m = createProgressMessage({
      toolUseID: 'tu_1',
      parentToolUseID: 'tu_p',
      data: {} as never,
    })
    expect(m.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('cada llamada obtiene un UUID fresco', () => {
    const a = createProgressMessage({
      toolUseID: 'tu',
      parentToolUseID: 'p',
      data: {} as never,
    })
    const b = createProgressMessage({
      toolUseID: 'tu',
      parentToolUseID: 'p',
      data: {} as never,
    })
    expect(a.uuid).not.toBe(b.uuid)
  })

  test('el campo data es el argumento verbatim (no se clona)', () => {
    // Documentado: la data pertenece a quien llama y se guarda por referencia.
    const data = { type: 'bash' as const, foo: 'bar' } as never
    const m = createProgressMessage({
      toolUseID: 'tu',
      parentToolUseID: 'p',
      data,
    })
    expect(m.data).toBe(data)
  })
})

describe('createToolResultStopMessage', () => {
  test('devuelve un bloque tool_result con is_error=true', () => {
    const r = createToolResultStopMessage('tu_xyz')
    expect(r.type).toBe('tool_result')
    expect(r.is_error).toBe(true)
  })

  test('devuelve el toolUseID recibido', () => {
    const r = createToolResultStopMessage('tu_xyz')
    expect(r.tool_use_id).toBe('tu_xyz')
  })

  test('el contenido es la cadena estandar CANCEL_MESSAGE', () => {
    const r = createToolResultStopMessage('tu_xyz')
    expect(typeof r.content).toBe('string')
    expect((r.content as string).length).toBeGreaterThan(0)
  })

  test('IDs distintos dan tool_use_id distinto y el mismo contenido', () => {
    const a = createToolResultStopMessage('a')
    const b = createToolResultStopMessage('b')
    expect(a.tool_use_id).toBe('a')
    expect(b.tool_use_id).toBe('b')
    expect(a.content).toBe(b.content)
  })
})

describe('formatCommandInputTags (ya probado en otro sitio; se re-verifica la forma)', () => {
  test('contiene las 3 etiquetas: name, message, args', () => {
    const r = formatCommandInputTags('model', 'opus')
    expect(r).toContain('<command-name>/model</command-name>')
    expect(r).toContain('<command-message>model</command-message>')
    expect(r).toContain('<command-args>opus</command-args>')
  })
})
