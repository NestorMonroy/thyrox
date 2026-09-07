/**
 * Porte COMPLETO de `ccnmt: packages/agent/messageQueueTypes.ts`.
 *
 * Tipos del mensaje de cola (placeholders decompilados en la fuente misma —
 * el comentario original así lo declara). `[key: string]: unknown` en
 * `QueueOperationMessage` permite campos adicionales no enumerados por la
 * fuente sin ampliar el contrato con estructura inventada.
 */

export type QueueOperationMessage = {
  type: 'queue-operation'
  operation: QueueOperation
  timestamp: string
  sessionId: string
  content?: string
  [key: string]: unknown
}

export type QueueOperation = 'enqueue' | 'dequeue' | 'remove' | string
