/**
 * Clasifica una petición interceptada como LLM, app o desconocida, por su
 * host, su ruta y la forma de su cuerpo.
 *
 * Porte de `omniroute: src/mitm/inspector/kindDetector.ts` (MIT).
 */

import type { InterceptedRequest } from "./types.ts";

/** Hosts conocidos de APIs de LLM. */
const LLM_HOST_PATTERNS: RegExp[] = [
  /^api\.openai\.com$/i,
  /^api\.anthropic\.com$/i,
  /^generativelanguage\.googleapis\.com$/i,
  /^.*\.openai\.azure\.com$/i,
  /^api\.mistral\.ai$/i,
  /^api\.deepseek\.com$/i,
  /^api\.groq\.com$/i,
  /^api\.together\.xyz$/i,
  /^api\.fireworks\.ai$/i,
  /^api\.cohere\.com$/i,
  /^api\.perplexity\.ai$/i,
  /^.*\.huggingface\.co$/i,
  /^openrouter\.ai$/i,
  /^api\.x\.ai$/i,
  /^api\.moonshot\.ai$/i,
  /^bigmodel\.cn$/i,
  /^.*\.bytedance\.com$/i,
  /^.*\.aliyun\.com$/i,
];

const LLM_PATH_PATTERNS: RegExp[] = [
  /\/(v1|v1beta)\/(chat\/)?completions/i,
  /\/messages/i,
  /\/embeddings/i,
  /\/responses/i,
  /\/models/i,
  /\/generateContent/i,
  /\/streamGenerateContent/i,
];

interface BodyShape {
  key: string;
  arrayItem?: boolean;
}

const LLM_BODY_SHAPES: BodyShape[] = [
  { key: "messages", arrayItem: true },
  { key: "contents", arrayItem: true },
  { key: "prompt" },
  { key: "input" },
  { key: "model" },
];

function matchesShape(json: Record<string, unknown>, shape: BodyShape): boolean {
  if (!(shape.key in json)) return false;
  if (shape.arrayItem) {
    return Array.isArray(json[shape.key]);
  }
  return true;
}

const LLM_UA_PATTERN = /codex|claude|gemini|antigravity|kiro|copilot|cursor/i;

export function detectKind(req: InterceptedRequest): "llm" | "app" | "unknown" {
  if (LLM_HOST_PATTERNS.some((re) => re.test(req.host))) return "llm";
  if (LLM_PATH_PATTERNS.some((re) => re.test(req.path))) return "llm";

  let bodySignalFired = false;
  if (req.requestBody) {
    try {
      const parsed = JSON.parse(req.requestBody) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const body = parsed as Record<string, unknown>;
        if (LLM_BODY_SHAPES.some((shape) => matchesShape(body, shape))) return "llm";
        // Un objeto JSON sin forma de LLM: señal clara de app.
        bodySignalFired = true;
      }
    } catch {
      // Un cuerpo que no es JSON no dice nada.
    }
  }

  const ua = req.requestHeaders["user-agent"] ?? req.requestHeaders["User-Agent"] ?? "";
  if (LLM_UA_PATTERN.test(ua)) return "llm";

  // "app" sólo si hubo una señal que no es de LLM (un cuerpo JSON sin forma
  // de LLM); sin ninguna, no se pudo detectar nada y es "unknown".
  return bodySignalFired ? "app" : "unknown";
}

