/**
 * Firmas de credencial, puras, que comparten el saneador de errores públicos
 * y quien más necesite reconocer una clave en un texto.
 *
 * Porte de `omniroute: open-sse/utils/credentialPatterns.ts` (MIT).
 */
export interface CredentialPattern {
  name: string;
  regex: RegExp;
  replacement: string;
}

export const CREDENTIAL_PATTERNS: CredentialPattern[] = [
  { name: "openai_proj", regex: /sk-proj-[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:openai]" },
  { name: "openai", regex: /\bsk-[A-Za-z0-9]{48}\b/g, replacement: "[REDACTED:openai]" },
  {
    name: "anthropic",
    regex: /sk-ant-api[0-9]?-[A-Za-z0-9_-]{20,}/g,
    replacement: "[REDACTED:anthropic]",
  },
  {
    name: "anthropic_alt",
    regex: /sk-ant-[A-Za-z0-9_-]{20,}/g,
    replacement: "[REDACTED:anthropic]",
  },
  // Groq (`gsk_` + 52) y xAI (`xai-` + 80). Sólo cota inferior, por la misma
  // razón que `google`: tachar de más un parecido no cuesta nada en un error;
  // tachar de menos filtra una credencial.
  { name: "groq", regex: /\bgsk_[A-Za-z0-9]{20,}/g, replacement: "[REDACTED:groq]" },
  { name: "xai", regex: /\bxai-[A-Za-z0-9]{20,}/g, replacement: "[REDACTED:xai]" },
  // {20,} y no los {35} exactos de una clave estándar de 39 caracteres: con la
  // longitud exacta, una clave más corta o más larga pasaba entera al error. En
  // un mensaje de error, tachar algo que sólo empieza por AIza no cuesta nada, y
  // no tachar una clave la filtra; la cota holgada es el lado correcto.
  { name: "google", regex: /AIza[0-9A-Za-z_-]{20,}/g, replacement: "[REDACTED:google]" },
  { name: "huggingface", regex: /hf_[A-Za-z0-9]{34}/g, replacement: "[REDACTED:hf]" },
  { name: "replicate", regex: /r8_[A-Za-z0-9]{37}/g, replacement: "[REDACTED:replicate]" },
  { name: "github", regex: /gh[pousr]_[A-Za-z0-9]{36,}/g, replacement: "[REDACTED:github]" },
  { name: "slack", regex: /xox[bpoa]-[A-Za-z0-9-]{10,}/g, replacement: "[REDACTED:slack]" },
  { name: "linear", regex: /lin_api_[A-Za-z0-9]{40}/g, replacement: "[REDACTED:linear]" },
  { name: "notion", regex: /secret_[A-Za-z0-9]{43}/g, replacement: "[REDACTED:notion]" },
  { name: "npm", regex: /npm_[A-Za-z0-9]{36}/g, replacement: "[REDACTED:npm]" },
  {
    name: "postman",
    regex: /PMAK-[a-f0-9]{8}-[a-f0-9]{32}/g,
    replacement: "[REDACTED:postman]",
  },
  {
    name: "discord",
    regex: /\b[MN][A-Za-z0-9]{23}\.[A-Za-z0-9]{6}\.[A-Za-z0-9]{27}\b/g,
    replacement: "[REDACTED:discord]",
  },
  {
    name: "stripe",
    regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}/g,
    replacement: "[REDACTED:stripe]",
  },
  {
    name: "square",
    regex: /sq0(?:atp-[0-9A-Za-z_-]{22}|csp-[0-9A-Za-z_-]{43})/g,
    replacement: "[REDACTED:square]",
  },
  { name: "aws_access_key", regex: /AKIA[0-9A-Z]{16}/g, replacement: "[REDACTED:aws]" },
  { name: "twilio", regex: /\bSK[0-9a-fA-F]{32}\b/g, replacement: "[REDACTED:twilio]" },
  {
    name: "sendgrid",
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    replacement: "[REDACTED:sendgrid]",
  },
  { name: "mailgun", regex: /key-[a-f0-9]{32}/g, replacement: "[REDACTED:mailgun]" },
  {
    name: "private_key",
    regex:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    replacement: "[REDACTED:private_key]",
  },
  {
    name: "jwt",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    replacement: "[REDACTED:jwt]",
  },
  {
    name: "connection_string",
    regex: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^:/@\s"']+:[^:/@\s"']+@/g,
    replacement: "[REDACTED:connection_string]",
  },
  {
    name: "auth_header",
    regex:
      /((?:["\x27]?(?:Authorization|x-api-key|api-key|apikey)["\x27]?\s*[:=]\s*["\x27]?)(?:(?:Bearer|Basic|Token)\s+)?)[A-Za-z0-9._~+/=-]{10,}/gi,
    replacement: "$1[REDACTED:auth_header]",
  },
  // El `sk-` genérico de todo proveedor compatible con OpenAI cuya clave no
  // mide 48 (DeepSeek 32 hex, Moonshot/Kimi 47-49, Together…). Tiene que ser la
  // ÚLTIMA entrada: quien la consume recorre en orden y sustituye al paso, así
  // que `openai_proj`, `openai` y `anthropic*` ya pusieron su etiqueta y ésta
  // sólo ve las formas `sk-` que nadie reclamó. El lookbehind, el mismo de
  // STRONG_CREDENTIAL_TOKEN en errorSanitization.ts, deja fuera palabras como
  // `risk-…`.
  {
    name: "openai_compatible",
    regex: /(?<![A-Za-z0-9])sk-[A-Za-z0-9._~+/=-]{20,}/g,
    replacement: "[REDACTED:openai_compatible]",
  },
];
