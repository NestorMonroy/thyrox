/**
 * `createAttachmentMessage` ≙ `Kd` de 2.1.275 (`chunk-mdt3sxrw.js`).
 */
import { describe, expect, test } from 'bun:test'
import { createAttachmentMessage } from '../attachments.js'

describe('createAttachmentMessage (Kd)', () => {
  test('envuelve el adjunto con uuid y marca de tiempo ISO', () => {
    const attachment = { type: 'queued_command', prompt: 'hola' }
    const m = createAttachmentMessage(attachment)
    expect(m.type).toBe('attachment')
    expect(m.attachment).toBe(attachment)
    expect(m.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(new Date(m.timestamp).toISOString()).toBe(m.timestamp)
  })
  test('cada mensaje lleva su propio uuid', () => {
    expect(createAttachmentMessage({ type: 'x' }).uuid).not.toBe(createAttachmentMessage({ type: 'x' }).uuid)
  })
  test('no lleva más claves que las cuatro del binario', () => {
    expect(Object.keys(createAttachmentMessage({ type: 'x' })).sort()).toEqual(['attachment', 'timestamp', 'type', 'uuid'])
  })
})
