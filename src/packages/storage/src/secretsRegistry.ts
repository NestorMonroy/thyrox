/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/secretsRegistry.ts`
 * (121 líneas fuente). Cero dependencias hermanas ausentes: el archivo
 * entero es lógica autocontenida (una tabla de expresiones regulares +
 * dos funciones puras que la consultan). Porte verbatim.
 *
 * Registro de expresiones regulares de redacción de secretos —
 * adaptado de ant v2.1.128 yg (0207.js).
 *
 * Cada regla tiene un campo `confidence` (`high` o `low`). Los patrones
 * de alta confianza son lo bastante ajustados como para que un match
 * sea casi con certeza un secreto real (así que pueden aplicarse a logs
 * sin consulta previa). Los de baja confianza son regexes más amplias
 * que pueden dar falsos positivos — quien las use debe hacerlo en
 * contextos donde sobre-redactar es el mal menor (p. ej. enviar líneas
 * de log a un sink de telemetría de terceros).
 *
 * La lista es deliberadamente no exhaustiva: el objetivo es atrapar los
 * patrones con más probabilidad de aparecer en salida de shell / result
 * de herramienta / volcado de entorno, no ser un escáner de secretos
 * completo.
 */
export type SecretConfidence = 'high' | 'low'

export type SecretPattern = {
  name: string
  re: RegExp
  confidence: SecretConfidence
}

const REGEXES: SecretPattern[] = [
  // -------------------- HIGH-CONFIDENCE --------------------
  // Anthropic API key (sk-ant-...). Prefijo fijo, longitud casi fija.
  {
    name: 'anthropic-api-key',
    re: /sk-ant-[a-zA-Z0-9_-]{40,}/g,
    confidence: 'high',
  },
  // OpenAI API key (sk-...). Longitud ≥ 40, charset alnum + guiones/guiones bajos.
  // No choca con el prefijo sk-ant- de arriba.
  {
    name: 'openai-api-key',
    re: /sk-(?!ant-)[A-Za-z0-9_-]{40,}/g,
    confidence: 'high',
  },
  // AWS access key id — prefijo fijo + longitud.
  { name: 'aws-access-key-id', re: /AKIA[0-9A-Z]{16}/g, confidence: 'high' },
  { name: 'aws-temporary-token', re: /ASIA[0-9A-Z]{16}/g, confidence: 'high' },
  // Tokens de GitHub fine-grained / clásicos — todos usan prefijos
  // ghp_/gho_/ghu_/ghs_/ghr_ con longitud fija.
  {
    name: 'github-token',
    re: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    confidence: 'high',
  },
  // Stripe live secret key. Las de test (sk_test_*) se omiten a propósito:
  // no son "secretos" bajo ningún modelo de amenaza razonable.
  {
    name: 'stripe-live-secret',
    re: /sk_live_[A-Za-z0-9]{16,}/g,
    confidence: 'high',
  },
  // Tokens de bot / app / usuario de Slack.
  {
    name: 'slack-token',
    re: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
    confidence: 'high',
  },
  // JWT genérico — tres segmentos base64url-ish separados por puntos.
  {
    name: 'jwt',
    re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    confidence: 'high',
  },
  // Clave privada de cuenta de servicio de Google (cabecera PEM).
  {
    name: 'pem-private-key',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    confidence: 'high',
  },

  // -------------------- LOW-CONFIDENCE --------------------
  // Cadenas hexadecimales genéricas de alta entropía que parecen tokens —
  // OJO: esto da falsos positivos con SHAs de commit / salidas de hash,
  // así que quien las use debe hacerlo por decisión explícita.
  {
    name: 'generic-hex-32',
    re: /\b[0-9a-f]{32}\b/g,
    confidence: 'low',
  },
  // Tokens alfanuméricos genéricos de 40+ caracteres — falsos positivos
  // con todo tipo de payloads.
  {
    name: 'generic-token-40',
    re: /\b[A-Za-z0-9_-]{40,}\b/g,
    confidence: 'low',
  },
  // Cabeceras Authorization Bearer — captura la línea completa de la
  // cabecera para que la porción del token quede enmascarada junto al
  // prefijo.
  {
    name: 'authorization-header',
    re: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi,
    confidence: 'low',
  },
]

export function getSecretPatterns(
  opts: { confidence?: SecretConfidence } = {},
): SecretPattern[] {
  if (opts.confidence === undefined) return REGEXES.slice()
  return REGEXES.filter(p => p.confidence === opts.confidence)
}

/**
 * Aplica los patrones solicitados a `text` y devuelve la forma redactada
 * (los matches se reemplazan por `[REDACTED:<name>]`). Útil para
 * sanear líneas de log antes de que salgan del proceso. Devuelve el
 * texto de entrada sin cambios cuando ningún patrón hace match.
 */
export function redactSecrets(
  text: string,
  opts: { confidence?: SecretConfidence } = {},
): string {
  let out = text
  for (const p of getSecretPatterns(opts)) {
    out = out.replace(p.re, `[REDACTED:${p.name}]`)
  }
  return out
}
