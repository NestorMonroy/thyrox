/**
 * Sanea el contenido de un payload de webhook de GitHub entrante antes
 * de que entre a la sesión.
 *
 * Se llama desde `useReplBridge.tsx` cuando `feature('KAIROS_GITHUB_WEBHOOKS')`
 * está activo. Retira patrones de secreto conocidos (tokens, API keys,
 * credenciales) preservando el contenido con significado (títulos de PR,
 * descripciones, mensajes de commit, etc.).
 *
 * Debe ser síncrono y nunca lanzar — ante error, devuelve un placeholder
 * seguro.
 *
 * Puerto de `ccnmt: packages/bridge/src/webhookSanitizer.ts`.
 * `redactSecrets` es un punto de inyección/reimplementación acotada — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import { redactSecrets } from './internal/pendingCrossPackageDeps.js'

/** Patrones que hacen match con formatos conocidos de secreto/token. */
const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Tokens de GitHub (PAT, OAuth, App, server-to-server)
  {
    pattern: /\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{10,}\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  // API keys de Anthropic
  { pattern: /\bsk-ant-[A-Za-z0-9_-]{10,}\b/g, replacement: '[REDACTED_ANTHROPIC_KEY]' },
  // Bearer tokens genéricos en cabeceras
  {
    pattern: /(Bearer\s+)[A-Za-z0-9._\-/+=]{20,}/gi,
    replacement: '$1[REDACTED_TOKEN]',
  },
  // Claves de acceso de AWS
  { pattern: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, replacement: '[REDACTED_AWS_KEY]' },
  // Claves secretas de AWS (cadenas base64-like de 40 chars tras labels comunes)
  {
    pattern:
      /(aws_secret_access_key|secret_key|SecretAccessKey)['":\s=]+[A-Za-z0-9/+=]{30,}/gi,
    replacement: '$1=[REDACTED_AWS_SECRET]',
  },
  // Patrones genéricos de API key (key=value o "key": "value")
  {
    pattern:
      /(api[_-]?key|apikey|secret|password|token|credential)['":\s=]+["']?[A-Za-z0-9._\-/+=]{16,}["']?/gi,
    replacement: '$1=[REDACTED]',
  },
  // Tokens de npm
  { pattern: /\bnpm_[A-Za-z0-9]{36}\b/g, replacement: '[REDACTED_NPM_TOKEN]' },
  // Tokens de Slack
  { pattern: /\bxox[bporas]-[A-Za-z0-9-]{10,}\b/g, replacement: '[REDACTED_SLACK_TOKEN]' },
]

/** Longitud máxima de contenido antes de truncar (100 KB). */
const MAX_CONTENT_LENGTH = 100_000

export function sanitizeInboundWebhookContent(content: string): string {
  try {
    if (!content) return content

    let sanitized = content

    // Redactar los patrones de secreto conocidos primero (antes de truncar,
    // para no partir un secreto justo en el límite del truncado)
    for (const { pattern, replacement } of SECRET_PATTERNS) {
      pattern.lastIndex = 0
      sanitized = sanitized.replace(pattern, replacement)
    }

    // Correr TAMBIÉN los patrones de alta confianza del registro compartido —
    // ant v2.1.128 yg (0207.js). La lista propia de webhookSanitizer y la
    // del registro compartido se solapan pero cada una atrapa cosas que la
    // otra no; aplicar ambas cubre sk-ant-, JWT, claves PEM, etc. que no
    // estaban en la lista específica de bridge.
    try {
      sanitized = redactSecrets(sanitized, { confidence: 'high' })
    } catch {
      // registro compartido no disponible — la lista propia de arriba es el piso
    }

    // Truncar payloads excesivamente grandes DESPUÉS de redactar
    if (sanitized.length > MAX_CONTENT_LENGTH) {
      sanitized = sanitized.slice(0, MAX_CONTENT_LENGTH) + '\n... [truncated]'
    }

    return sanitized
  } catch {
    // Nunca lanzar, nunca devolver contenido crudo — placeholder seguro
    return '[webhook content redacted due to sanitization error]'
  }
}
