/**
 * Porte COMPLETO de `ccnmt: packages/agent/skillSearch/prefetch.ts`.
 *
 * La fuente misma es un stub auto-generado: los tres símbolos son no-ops
 * tipados, sin lógica de prefetch real detrás. El porte lo refleja tal cual.
 *
 * DIVERGENCIA DE ALCANCE en dos de los tipos de la firma:
 *
 * - `Attachment` (fuente: `../attachments.js`, ausente en este porte) se
 *   sustituye por `AttachmentEntry` de `../loop/context/attachments.ts`, que
 *   es el tipo de adjunto que este árbol ya declara.
 * - `Message` (fuente: `@claude-code-how-works/repl/replTypes/message.js`,
 *   paquete `repl` inexistente en este árbol) se sustituye por `Message` de
 *   `../messageShapes.ts`.
 * - `ToolUseContext` viene ya de `@thyrox/tool-registry/Tool.js`, como en
 *   la fuente.
 *
 * Como los tres cuerpos son no-ops que no inspeccionan ningún campo de estos
 * parámetros, la sustitución no cambia el comportamiento observable — sólo
 * la forma declarada del tipo.
 */

import type { AttachmentEntry } from '../loop/context/attachments.ts'
import type { Message } from '../messageShapes.ts'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'

export const startSkillDiscoveryPrefetch: (
  input: string | null,
  messages: Message[],
  toolUseContext: ToolUseContext,
) => Promise<AttachmentEntry[]> = async () => []

export const collectSkillDiscoveryPrefetch: (
  pending: Promise<AttachmentEntry[]>,
) => Promise<AttachmentEntry[]> = async pending => pending

export const getTurnZeroSkillDiscovery: (
  input: string,
  messages: Message[],
  context: ToolUseContext,
) => Promise<AttachmentEntry | null> = async () => null
