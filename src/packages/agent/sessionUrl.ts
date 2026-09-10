/**
 * Reconocedor del identificador de reanudación de una sesión — porte de
 * `ccnmt: packages/agent/sessionUrl.ts`.
 *
 * `validateUuid` viene de `./uuid.ts`, ya portado en este árbol; el resto
 * del módulo es puro y sin más dependencias que `node:crypto`.
 */
import { randomUUID, type UUID } from 'crypto'
import { validateUuid } from './uuid.ts'

export type ParsedSessionUrl = {
  sessionId: UUID
  ingressUrl: string | null
  isUrl: boolean
  jsonlFile: string | null
  isJsonlFile: boolean
}

/**
 * Parsea un identificador de reanudación de sesión, que puede ser:
 * - una ruta a un archivo JSONL (p. ej. `session.jsonl`);
 * - un UUID plano;
 * - una URL que contiene el id de sesión (p. ej.
 *   `https://api.example.com/v1/session_ingress/session/550e8400-...`).
 *
 * @param resumeIdentifier — la URL, ruta o id de sesión a parsear.
 * @returns la información de sesión parseada, o `null` si no es válida.
 */
export function parseSessionIdentifier(
  resumeIdentifier: string,
): ParsedSessionUrl | null {
  // Se verifica la ruta JSONL ANTES de parsear como URL: una ruta absoluta
  // de Windows (p. ej. C:\path\file.jsonl) parsea como URL válida con "C:"
  // como protocolo.
  if (resumeIdentifier.toLowerCase().endsWith('.jsonl')) {
    return {
      sessionId: randomUUID() as UUID,
      ingressUrl: null,
      isUrl: false,
      jsonlFile: resumeIdentifier,
      isJsonlFile: true,
    }
  }

  // ¿Es un UUID plano?
  if (validateUuid(resumeIdentifier)) {
    return {
      sessionId: resumeIdentifier as UUID,
      ingressUrl: null,
      isUrl: false,
      jsonlFile: null,
      isJsonlFile: false,
    }
  }

  // ¿Es una URL?
  try {
    const url = new URL(resumeIdentifier)

    // Se usa la URL completa como ingressUrl. El sessionId siempre se
    // genera fresco.
    return {
      sessionId: randomUUID() as UUID,
      ingressUrl: url.href,
      isUrl: true,
      jsonlFile: null,
      isJsonlFile: false,
    }
  } catch {
    // No es una URL válida.
  }

  return null
}
