/**
 * Las piezas de `compaction/compact.ts` que se ejercitan sin red
 * (`ccnmt: packages/agent/compaction/compact.ts`): `stripReinjectedAttachments`
 * (:212), `truncateHeadForPTLRetry` (:249), `createPlanAttachmentIfNeeded`
 * (:1434), `createSkillAttachmentIfNeeded` (:1459),
 * `annotateBoundaryWithPreservedSegment` (:348) y `createCompactCanUseTool`
 * (:1064).
 *
 * `@thyrox/storage/plans.js` se sustituye con `mock.module`: el plan real
 * vive bajo el directorio de configuración del usuario, que un test no debe
 * tocar. El resto —agrupación por ronda, estimación de tokens, estado de
 * skills invocadas— es el mecanismo real. La bandera de build
 * `EXPERIMENTAL_SKILL_SEARCH` no se puede encender desde un test.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'

let planContent: string | null = null
mock.module('@thyrox/storage/plans.js', () => ({
  getPlan: () => planContent,
  getPlanFilePath: (agentId?: string) => (agentId ? `/plans/plan-agent-${agentId}.md` : '/plans/plan.md'),
}))

import {
  annotateBoundaryWithPreservedSegment,
  createCompactCanUseTool,
  createPlanAttachmentIfNeeded,
  createSkillAttachmentIfNeeded,
  POST_COMPACT_MAX_TOKENS_PER_SKILL,
  stripReinjectedAttachments,
  truncateHeadForPTLRetry,
} from '../compaction/compact.ts'
import type { AssistantMessage, Message, SystemCompactBoundaryMessage } from '../messageShapes.ts'
import type { AgentId } from '../idTypes.ts'
import { roughTokenCountEstimationForMessages } from '../tokenEstimation.ts'
import { addInvokedSkill, clearInvokedSkills } from '@thyrox/app-host/bootstrap/state.js'

const user = (text: string): Message => ({
  type: 'user',
  uuid: randomUUID(),
  message: { role: 'user', content: [{ type: 'text', text }] },
})
const assistant = (id: string, text: string): Message => ({
  type: 'assistant',
  uuid: randomUUID(),
  message: { id, role: 'assistant', content: [{ type: 'text', text }] },
})
const attachment = (type: string): Message => ({ type: 'attachment', uuid: randomUUID(), attachment: { type } })

/** Una respuesta de prompt-too-long, con o sin las cifras que dan el hueco. */
const ptlResponse = (detail?: string): AssistantMessage => ({
  type: 'assistant',
  uuid: randomUUID(),
  isApiErrorMessage: true,
  errorDetails: detail,
  message: { role: 'assistant', content: [{ type: 'text', text: 'Prompt is too long' }] },
})

/** Cuatro rondas: el preámbulo y tres turnos de asistente con su respuesta. */
function fourRounds(): Message[] {
  return [
    user('inicio'),
    assistant('a1', 'x'.repeat(400)),
    user('r1'),
    assistant('a2', 'y'.repeat(400)),
    user('r2'),
    assistant('a3', 'z'.repeat(400)),
    user('r3'),
  ]
}

describe('stripReinjectedAttachments', () => {
  test('con la bandera apagada devuelve los mismos mensajes', () => {
    const messages = [attachment('skill_discovery'), user('hola')]
    expect(stripReinjectedAttachments(messages)).toBe(messages)
  })

  // La rama encendida no se mide: `feature()` de `bun:bundle` es una bandera
  // de compilación y un `mock.module` no la alcanza (medido: el mock no
  // cambia el veredicto). Queda declarada, no probada.
})

describe('truncateHeadForPTLRetry', () => {
  test('con menos de dos rondas no hay nada que descartar', () => {
    expect(truncateHeadForPTLRetry([user('solo')], ptlResponse())).toBeNull()
  })

  test('con el hueco conocido descarta las rondas más antiguas hasta cubrirlo', () => {
    const messages = fourRounds()
    const firstRound = messages.slice(0, 1)
    const gap = roughTokenCountEstimationForMessages(firstRound as Parameters<typeof roughTokenCountEstimationForMessages>[0]) + 1
    const out = truncateHeadForPTLRetry(messages, ptlResponse(`prompt is too long: ${100 + gap} tokens > 100 maximum`))
    // Cubrir el hueco exige el preámbulo y la primera ronda de asistente.
    expect(out).not.toBeNull()
    const kept = out ?? []
    expect(kept[0]?.type).toBe('user')
    expect(kept[0]?.message?.content).toBe('[earlier conversation truncated for compaction retry]')
    expect(kept.slice(1)).toEqual(messages.slice(3))
  })

  test('sin hueco legible descarta el 20% de las rondas, al menos una', () => {
    const messages = fourRounds()
    const out = truncateHeadForPTLRetry(messages, ptlResponse())
    expect(out).not.toBeNull()
    const kept = out ?? []
    // Cae el preámbulo; lo conservado empieza por un asistente, así que se
    // antepone el marcador para que la API reciba un usuario primero.
    expect(kept[0]?.message?.content).toBe('[earlier conversation truncated for compaction retry]')
    expect(kept.slice(1)).toEqual(messages.slice(1))
  })

  test('siempre conserva al menos una ronda aunque el hueco pida más', () => {
    const messages = fourRounds()
    const out = truncateHeadForPTLRetry(messages, ptlResponse('prompt is too long: 999999 tokens > 1 maximum'))
    const kept = out ?? []
    expect(kept.slice(1)).toEqual(messages.slice(5))
  })

  test('un marcador de un reintento anterior no cuenta como ronda propia', () => {
    const first = truncateHeadForPTLRetry(fourRounds(), ptlResponse()) ?? []
    // Segundo reintento sobre la salida del primero: avanza una ronda más,
    // en vez de descartar sólo el marcador y volver a añadirlo.
    const second = truncateHeadForPTLRetry(first, ptlResponse()) ?? []
    expect(second.length).toBeLessThan(first.length)
    expect(second[0]?.message?.content).toBe('[earlier conversation truncated for compaction retry]')
    expect(second.filter(m => m.message?.content === '[earlier conversation truncated for compaction retry]')).toHaveLength(1)
  })
})

describe('createPlanAttachmentIfNeeded', () => {
  afterEach(() => {
    planContent = null
  })

  test('sin plan no hay adjunto', () => {
    expect(createPlanAttachmentIfNeeded()).toBeNull()
  })

  test('con plan devuelve su ruta y su contenido, por agente', () => {
    planContent = '# plan\n1. medir'
    const message = createPlanAttachmentIfNeeded('ag-7' as AgentId)
    expect(message?.attachment).toEqual({
      type: 'plan_file_reference',
      planFilePath: '/plans/plan-agent-ag-7.md',
      planContent: '# plan\n1. medir',
    })
  })
})

describe('createSkillAttachmentIfNeeded', () => {
  beforeEach(() => clearInvokedSkills())
  afterEach(() => clearInvokedSkills())

  test('sin skills invocadas no hay adjunto', () => {
    expect(createSkillAttachmentIfNeeded()).toBeNull()
  })

  test('sólo entran las skills del agente pedido, la más reciente primero', async () => {
    addInvokedSkill('vieja', '/s/vieja.md', 'contenido viejo', null)
    addInvokedSkill('ajena', '/s/ajena.md', 'de otro agente', 'otro')
    // `invokedAt` es Date.now(): dos altas en el mismo milisegundo empatan.
    await new Promise(resolve => setTimeout(resolve, 3))
    addInvokedSkill('nueva', '/s/nueva.md', 'contenido nuevo', null)
    const message = createSkillAttachmentIfNeeded()
    const skills = message?.attachment.skills as { name: string; path: string; content: string }[]
    expect(skills.map(s => s.name)).toEqual(['nueva', 'vieja'])
    expect(skills[1]?.path).toBe('/s/vieja.md')
  })

  test('una skill que supera el tope por skill se trunca por la cabecera y lo declara', () => {
    addInvokedSkill('larga', '/s/larga.md', 'a'.repeat(POST_COMPACT_MAX_TOKENS_PER_SKILL * 4 * 2), null)
    const message = createSkillAttachmentIfNeeded()
    const skills = message?.attachment.skills as { content: string }[]
    const content = skills[0]?.content ?? ''
    expect(content.length).toBeLessThanOrEqual(POST_COMPACT_MAX_TOKENS_PER_SKILL * 4)
    expect(content.endsWith('use Read on the skill path if you need the full text]')).toBe(true)
  })
})

describe('annotateBoundaryWithPreservedSegment', () => {
  const boundary = (): SystemCompactBoundaryMessage => ({
    type: 'system',
    subtype: 'compact_boundary',
    uuid: randomUUID(),
    compactMetadata: { trigger: 'manual', preTokens: 10 },
  })

  test('sin mensajes conservados devuelve la misma frontera', () => {
    const b = boundary()
    expect(annotateBoundaryWithPreservedSegment(b, randomUUID(), [])).toBe(b)
  })

  test('con mensajes conservados anota cabeza, ancla y cola sin perder la metadata previa', () => {
    const b = boundary()
    const head = user('a')
    const tail = user('c')
    const keep = [head, user('b'), tail]
    const anchor = randomUUID()
    const out = annotateBoundaryWithPreservedSegment(b, anchor, keep)
    expect(out.compactMetadata).toEqual({
      trigger: 'manual',
      preTokens: 10,
      preservedSegment: { headUuid: head.uuid, anchorUuid: anchor, tailUuid: tail.uuid },
    })
  })
})

describe('createCompactCanUseTool', () => {
  test('deniega toda herramienta durante la compactación', async () => {
    const canUseTool = createCompactCanUseTool()
    const decision = await (canUseTool as () => Promise<{ behavior: string; message: string }>)()
    expect(decision.behavior).toBe('deny')
    expect(decision.message).toBe('Tool use is not allowed during compaction')
  })
})
