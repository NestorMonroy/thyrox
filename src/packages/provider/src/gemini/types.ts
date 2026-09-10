/**
 * La forma del cable de Gemini — porte de
 * `ccnmt: packages/provider/src/gemini/types.ts` (86 lineas).
 *
 * El puerto es COMPLETO: la constante y los trece tipos de la fuente, con los
 * mismos nombres y los mismos campos opcionales. Ninguno queda fuera.
 *
 * Es declaracion pura salvo `GEMINI_THOUGHT_SIGNATURE_FIELD`, que es el unico
 * valor en ejecucion: el nombre del campo con que la firma de un bloque de
 * pensamiento viaja de ida y vuelta a traves de la forma de Anthropic, que no
 * tiene sitio propio para ella.
 */

export const GEMINI_THOUGHT_SIGNATURE_FIELD = '_geminiThoughtSignature'

export type GeminiFunctionCall = {
  name?: string
  args?: Record<string, unknown>
}

export type GeminiFunctionResponse = {
  name?: string
  response?: Record<string, unknown>
}

export type GeminiInlineData = {
  mimeType: string
  data: string
}

export type GeminiPart = {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: GeminiFunctionCall
  functionResponse?: GeminiFunctionResponse
  inlineData?: GeminiInlineData
}

export type GeminiContent = {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export type GeminiFunctionDeclaration = {
  name: string
  description?: string
  parameters?: Record<string, unknown>
  parametersJsonSchema?: Record<string, unknown>
}

export type GeminiTool = {
  functionDeclarations: GeminiFunctionDeclaration[]
}

export type GeminiFunctionCallingConfig = {
  mode: 'AUTO' | 'ANY' | 'NONE'
  allowedFunctionNames?: string[]
}

export type GeminiGenerateContentRequest = {
  contents: GeminiContent[]
  systemInstruction?: {
    parts: Array<{ text: string }>
  }
  tools?: GeminiTool[]
  toolConfig?: {
    functionCallingConfig: GeminiFunctionCallingConfig
  }
  generationConfig?: {
    temperature?: number
    thinkingConfig?: {
      includeThoughts?: boolean
      thinkingBudget?: number
    }
  }
}

export type GeminiUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  totalTokenCount?: number
}

export type GeminiCandidate = {
  content?: {
    role?: string
    parts?: GeminiPart[]
  }
  finishReason?: string
  index?: number
}

export type GeminiStreamChunk = {
  candidates?: GeminiCandidate[]
  usageMetadata?: GeminiUsageMetadata
  modelVersion?: string
}
