/**
 * Resuelve adjuntos file_uuid en mensajes de usuario entrantes del
 * bridge.
 *
 * El composer web sube vía /api/{org}/upload autenticado por cookie, y
 * envía file_uuid junto al mensaje. Aquí se obtiene cada uno vía GET
 * /api/oauth/files/{uuid}/content (autenticado por oauth, mismo store),
 * se escribe a ~/.claude/uploads/{sessionId}/, y se devuelven refs
 * @path para anteponer. La herramienta Read de Claude lo toma de ahí.
 *
 * Best-effort: cualquier fallo (sin token, red, no-2xx, disco) registra
 * debug y omite ese adjunto. El mensaje igual llega a Claude, sólo sin
 * @path.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/inboundAttachments.ts`.
 * `getSessionId`/`logForDebugging`/`getClaudeConfigHomeDir`/`lazySchema`
 * son sustitutos — ver `internal/pendingCrossPackageDeps.ts`.
 */
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import axios from 'axios'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { z } from 'zod/v4'
import {
  getClaudeConfigHomeDir,
  getSessionId,
  lazySchema,
  logForDebugging,
} from './internal/pendingCrossPackageDeps.js'
import { getBridgeAccessToken, getBridgeBaseUrl } from './bridgeConfig.js'

const DOWNLOAD_TIMEOUT_MS = 30_000

function debug(msg: string): void {
  logForDebugging(`[bridge:inbound-attach] ${msg}`)
}

const attachmentSchema = lazySchema(() =>
  z.object({
    file_uuid: z.string(),
    file_name: z.string(),
  }),
)
const attachmentsArraySchema = lazySchema(() => z.array(attachmentSchema()))

export type InboundAttachment = z.infer<ReturnType<typeof attachmentSchema>>

/** Extrae file_attachments de un mensaje entrante débilmente tipado. */
export function extractInboundAttachments(msg: unknown): InboundAttachment[] {
  if (typeof msg !== 'object' || msg === null || !('file_attachments' in msg)) {
    return []
  }
  const parsed = attachmentsArraySchema().safeParse(msg.file_attachments)
  return parsed.success ? parsed.data : []
}

/**
 * Retira componentes de ruta y conserva sólo caracteres seguros para un
 * nombre de archivo. file_name viene de la red (composer web), así que
 * se trata como no confiable aunque el composer lo controle.
 */
function sanitizeFileName(name: string): string {
  const base = basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
  return base || 'attachment'
}

function uploadsDir(): string {
  return join(getClaudeConfigHomeDir(), 'uploads', getSessionId())
}

/**
 * Obtiene y escribe un adjunto. Devuelve la ruta absoluta en éxito,
 * undefined ante cualquier fallo.
 */
async function resolveOne(att: InboundAttachment): Promise<string | undefined> {
  const token = getBridgeAccessToken()
  if (!token) {
    debug('skip: no oauth token')
    return undefined
  }

  let data: Buffer
  try {
    // getOauthConfig() (vía getBridgeBaseUrl) lanza ante un
    // CLAUDE_CODE_CUSTOM_OAUTH_URL no admitido en la allowlist —
    // se mantiene dentro del try para que una URL FedStart mala degrade
    // a "sin @path" en vez de tumbar el loop lector de print.ts (que no
    // tiene catch alrededor del await).
    const url = `${getBridgeBaseUrl()}/api/oauth/files/${encodeURIComponent(att.file_uuid)}/content`
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT_MS,
      validateStatus: () => true,
    })
    if (response.status !== 200) {
      debug(`fetch ${att.file_uuid} failed: status=${response.status}`)
      return undefined
    }
    data = Buffer.from(response.data)
  } catch (e) {
    debug(`fetch ${att.file_uuid} threw: ${e}`)
    return undefined
  }

  // El prefijo uuid hace imposibles las colisiones entre mensajes y
  // dentro de uno (mismo nombre de archivo, archivos distintos). 8
  // caracteres alcanzan — esto no es seguridad.
  const safeName = sanitizeFileName(att.file_name)
  const prefix = (
    att.file_uuid.slice(0, 8) || randomUUID().slice(0, 8)
  ).replace(/[^a-zA-Z0-9_-]/g, '_')
  const dir = uploadsDir()
  const outPath = join(dir, `${prefix}-${safeName}`)

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(outPath, data)
  } catch (e) {
    debug(`write ${outPath} failed: ${e}`)
    return undefined
  }

  debug(`resolved ${att.file_uuid} → ${outPath} (${data.length} bytes)`)
  return outPath
}

/**
 * Resuelve todos los adjuntos de un mensaje entrante a una cadena
 * prefijo de refs @path. Cadena vacía si ninguno se resolvió.
 */
export async function resolveInboundAttachments(
  attachments: InboundAttachment[],
): Promise<string> {
  if (attachments.length === 0) return ''
  debug(`resolving ${attachments.length} attachment(s)`)
  const paths = await Promise.all(attachments.map(resolveOne))
  const ok = paths.filter((p): p is string => p !== undefined)
  if (ok.length === 0) return ''
  // Forma entrecomillada — extractAtMentionedFiles trunca refs @ sin
  // comillas en el primer espacio, lo que rompe cualquier home dir con
  // espacios (/Users/John Smith/).
  return ok.map(p => `@"${p}"`).join(' ') + ' '
}

/**
 * Antepone refs @path al contenido, sea cual sea su forma. Apunta al
 * ÚLTIMO bloque de texto — processUserInputBase lee inputString de
 * processedBlocks[processedBlocks.length - 1], así que poner refs en
 * block[0] hace que se ignoren silenciosamente para contenido [text, image].
 */
export function prependPathRefs(
  content: string | Array<ContentBlockParam>,
  prefix: string,
): string | Array<ContentBlockParam> {
  if (!prefix) return content
  if (typeof content === 'string') return prefix + content
  const i = content.findLastIndex(b => b.type === 'text')
  if (i !== -1) {
    const b = content[i]!
    if (b.type === 'text') {
      return [
        ...content.slice(0, i),
        { ...b, text: prefix + b.text },
        ...content.slice(i + 1),
      ]
    }
  }
  // Sin bloque de texto — apenda uno al final para que sea el último.
  return [...content, { type: 'text', text: prefix.trimEnd() }]
}

/**
 * Conveniencia: extrae + resuelve + antepone. No-op cuando el mensaje no
 * tiene campo file_attachments (vía rápida — sin red, devuelve la misma
 * referencia).
 */
export async function resolveAndPrepend(
  msg: unknown,
  content: string | Array<ContentBlockParam>,
): Promise<string | Array<ContentBlockParam>> {
  const attachments = extractInboundAttachments(msg)
  if (attachments.length === 0) return content
  const prefix = await resolveInboundAttachments(attachments)
  return prependPathRefs(content, prefix)
}
