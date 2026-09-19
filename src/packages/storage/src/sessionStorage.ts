/**
 * Persistencia de sesión: transcript en disco, "primer prompt" de display,
 * y (des)serialización de mensajes.
 *
 * Adaptación de ccnmt `packages/storage/src/sessionStorage.ts` — 4642 líneas,
 * el archivo más grande del paquete `storage`.
 *
 * PORTE PARCIAL DECLARADO, con su cobertura MEDIDA — no transcrita.
 *
 * La version anterior de este parrafo afirmaba «solo se portan dos simbolos»
 * y nombraba `getFirstMeaningfulUserMessageTextContent` y `removeExtraFields`.
 * Medido por conducta: el archivo exporta SEIS declaraciones propias
 * —esos dos mas `setBuiltInCommandNamesFn`, `FirstPromptMessage`,
 * `RemovableFieldsMessage` y `SerializedMessage`— contra 74 de la fuente.
 * Una cifra que es propiedad de un archivo vivo no se transcribe a prosa; el
 * comando que la publica es:
 *
 *     gawk 'match($0,/^export (async function|function|const|type|interface|class|enum) +([A-Za-z_][A-Za-z0-9_]*)/,m){print m[2]}' <archivo>
 *
 * Y su PREMISA declarada —«los unicos que el conjunto de tests portado ejerce»,
 * «ningun test aqui mide» el resto— tambien caduco: el typecheck del arbol
 * publica 134 errores TS2305 contra este modulo, de 67 simbolos distintos que
 * sus consumidores piden. Los consumidores existen; lo que no existia era la
 * medicion.
 *
 * Lo que sigue fuera del porte, ahora con su razon real: la carga y escritura
 * de transcript JSONL, los tombstones, el relink de segmentos preservados tras
 * compactacion y `updateSessionName` dependen de I/O de disco y de
 * `@thyrox/agent` (`Message`, `isCompactBoundaryMessage`), que este paquete no
 * importa todavia (DEC-04). Son 51 de los 67; los otros 16 los cubren los tres
 * modulos hermanos, y su fachada esta al final de este archivo.
 *
 * Sustitutos locales (misma razón que en `conversationChain.ts` y
 * `internal/pendingCrossPackageDeps.ts` — DEC-04, sin cross-import
 * `@thyrox/*` todavía):
 *
 * - `COMMAND_NAME_TAG` — literal `'command-name'`, verbatim del contrato de
 *   `@claude-code-how-works/command-runtime/xml.js` (ya presente, sin
 *   cambio de forma, en `@thyrox/command-runtime: src/xml.ts`).
 * - `extractTag` — reimplementación local, funcionalmente equivalente para
 *   los tres usos de este archivo (`command-name`, `command-args`,
 *   `bash-input`, ninguno anidado ni con atributos): extrae el contenido de
 *   la primera etiqueta `<tagName>...</tagName>` con una regex no-codiciosa.
 *   No reproduce el tracking de profundidad de anidamiento de la fuente
 *   (`@claude-code-how-works/agent/messages.js`, ya porteado fielmente en
 *   `@thyrox/agent: messages.ts::extractTag`) porque ningún caso de este
 *   porte anida una etiqueta consigo misma.
 * - `builtInCommandNames` — en la fuente viene de
 *   `@claude-code-how-works/command-runtime/runtime.js` y dispara
 *   `ensureCommandRuntimeInstalled()` bajo el capó (por eso el propio test
 *   de la fuente lo mockea). Aquí es un setter DI de módulo
 *   (`setBuiltInCommandNamesFn`), mismo patrón que `setGetCwdFn` de
 *   `internal/pendingCrossPackageDeps.ts` — el default es el conjunto que el
 *   test fija (`model`, `clear`, `help`, `exit`, `compact`), y un consumidor
 *   real lo sobreescribe cuando `@thyrox/command-runtime` exponga el
 *   registro completo.
 */
import type { UUID } from 'crypto'

/** Literal verbatim — ver docstring del módulo. */
const COMMAND_NAME_TAG = 'command-name'

/**
 * Extrae el contenido de la primera etiqueta `<tagName>...</tagName>` de
 * `text`. Ver docstring del módulo para el alcance de esta reimplementación
 * local (sin anidamiento).
 */
function extractTag(text: string, tagName: string): string | null {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(
    `<${escaped}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
  ).exec(text)
  return match ? match[1]! : null
}

/** Ver docstring del módulo — sustituto DI de `builtInCommandNames`. */
let _builtInCommandNames: () => Set<string> = () =>
  new Set(['model', 'clear', 'help', 'exit', 'compact'])

export function setBuiltInCommandNamesFn(fn: () => Set<string>): void {
  _builtInCommandNames = fn
}

function builtInCommandNames(): Set<string> {
  return _builtInCommandNames()
}

/**
 * Regex pre-compilada para saltar mensajes no significativos al extraer el
 * primer prompt. Coincide con cualquier cosa que empiece con una etiqueta
 * XML en minúsculas (contexto de IDE, salida de hook, notificaciones de
 * tarea, mensajes de canal, etc.) o un marcador sintético de interrupción.
 * Verbatim de la fuente — el valor ES el contrato de qué se filtra.
 */
const SKIP_FIRST_PROMPT_PATTERN =
  /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/

interface TextBlock {
  type: 'text'
  text?: string
}

type MessageContent = string | Array<TextBlock | { type: string }>

/** El subconjunto de `Message` que `getFirstMeaningfulUserMessageTextContent` lee. */
export interface FirstPromptMessage {
  type: string
  isMeta?: boolean
  isCompactSummary?: boolean
  message?: {
    content?: MessageContent
  }
}

/**
 * Obtiene el texto del último mensaje de usuario procesado (i.e., antes de
 * que aparezca cualquier mensaje que no sea de usuario). Se usa para
 * determinar el título de display de la sesión ("primer prompt").
 */
export function getFirstMeaningfulUserMessageTextContent<
  T extends FirstPromptMessage,
>(transcript: T[]): string | undefined {
  for (const msg of transcript) {
    if (msg.type !== 'user' || msg.isMeta) continue
    // Salta mensajes de resumen de compactación — no deben tratarse como
    // el primer prompt.
    if ('isCompactSummary' in msg && msg.isCompactSummary) continue

    const content = msg.message?.content
    if (!content) continue

    // Recolecta todos los valores de texto. Para contenido en array (común
    // en VS Code, donde las etiquetas de metadata de IDE preceden al
    // prompt real del usuario), itera todos los bloques de texto para no
    // perder el prompt real escondido tras bloques
    // <ide_selection>/<ide_opened_file>.
    const texts: string[] = []
    if (typeof content === 'string') {
      texts.push(content)
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && (block as TextBlock).text) {
          texts.push((block as TextBlock).text!)
        }
      }
    }

    for (const textContent of texts) {
      if (!textContent) continue

      const commandNameTag = extractTag(textContent, COMMAND_NAME_TAG)
      if (commandNameTag) {
        const commandName = commandNameTag.replace(/^\//, '')

        // Si es un comando built-in, es improbable que aporte contexto
        // significativo (p. ej. `/model sonnet`).
        if (builtInCommandNames().has(commandName)) {
          continue
        } else {
          // Si no, para comandos custom, se conserva sólo si tiene
          // argumentos (p. ej. `/review reticulate splines`).
          const commandArgs = extractTag(textContent, 'command-args')?.trim()
          if (!commandArgs) {
            continue
          }
          // Devuelve el comando formateado en limpio en vez del XML crudo.
          return `${commandNameTag} ${commandArgs}`
        }
      }

      // Formatea la entrada de bash con prefijo ! (como la persona la
      // tecleó). Se chequea antes del salto genérico de XML para que las
      // sesiones en modo bash tengan un título significativo.
      const bashInput = extractTag(textContent, 'bash-input')
      if (bashInput) {
        return `! ${bashInput}`
      }

      // Salta mensajes no significativos (salida de comando local, salida
      // de hook, prompts de tick autónomo, notificaciones de tarea,
      // etiquetas de metadata pura de IDE).
      if (SKIP_FIRST_PROMPT_PATTERN.test(textContent)) {
        continue
      }

      return textContent
    }
  }
  return undefined
}

/** El subconjunto de `TranscriptMessage` que `removeExtraFields` recibe. */
export interface RemovableFieldsMessage {
  uuid: UUID
  parentUuid?: UUID
  isSidechain?: boolean
  [key: string]: unknown
}

/** El resultado de `removeExtraFields` — sin `parentUuid` ni `isSidechain`. */
export type SerializedMessage = Omit<
  RemovableFieldsMessage,
  'parentUuid' | 'isSidechain'
>

/**
 * Retira los campos que no se serializan a disco (`parentUuid`,
 * `isSidechain`) antes de escribir el transcript a JSONL. Persistirlos haría
 * que, al recargar, se reconstruyan cadenas fantasma.
 */
export function removeExtraFields(
  transcript: RemovableFieldsMessage[],
): SerializedMessage[] {
  return transcript.map(m => {
    const { isSidechain, parentUuid, ...serializedMessage } = m
    return serializedMessage
  })
}

// ---------------------------------------------------------------------------
// RE-EXPORTS DE LOS TRES HERMANOS — la fuente hace exactamente esto.
//
// `ccnmt: packages/storage/src/sessionStorage.ts:179,214,234` declara tres
// bloques `export {...} from` porque los simbolos se MUDARON a modulos
// hermanos (#132 en su propio historial) y el archivo quedo como fachada para
// los consumidores existentes. Sus comentarios lo dicen verbatim: «Predicates
// moved to ./sessionStoragePredicates.ts», «Path helpers moved to
// ./sessionPaths.ts (#132). Re-exported here for existing consumers», «Agent +
// remote-agent metadata I/O moved to ./agentMetadata.ts (#132)».
//
// Los tres hermanos YA estan portados en este paquete —y son mas grandes que
// los de la fuente: 2575/8136/7132 bytes contra 2285/3739/5844—. Lo que
// faltaba era la fachada, no el contenido: 16 de los 67 simbolos que los
// consumidores piden a `sessionStorage.js` viven en ellos.
//
// El primer instrumento que midio esto concluyo «18 simbolos no estan en la
// fuente» porque su patron leia la FORMA DE DECLARACION (`export function X`)
// y no la de re-export. Los 18 estaban; el significante no era el significado.
export {
  isChainParticipant,
  isEphemeralToolProgress,
  isTranscriptMessage,
  type PredicateEntry,
} from './sessionStoragePredicates.js'

export {
  clearAgentTranscriptSubdir,
  getAgentTranscriptPath,
  getOriginalCwd,
  getProjectDir,
  getProjectsDir,
  getSessionId,
  getSessionProjectDir,
  getTranscriptPath,
  getTranscriptPathForSession,
  MAX_TRANSCRIPT_READ_BYTES,
  setAgentTranscriptSubdir,
  setOriginalCwd,
  setSessionId,
  setSessionProjectDir,
} from './sessionPaths.js'

export {
  type AgentMetadata,
  deleteRemoteAgentMetadata,
  listRemoteAgentMetadata,
  readAgentMetadata,
  readRemoteAgentMetadata,
  type RemoteAgentMetadata,
  writeAgentMetadata,
  writeRemoteAgentMetadata,
} from './agentMetadata.js'
