import { randomUUID } from 'crypto'

/**
 * Porte de `ccnmt: packages/command-runtime/src/promptShellExecution.ts`.
 *
 * La lógica ejecutable y sus comentarios se portan VERBATIM — son el
 * objeto de los pins de `__tests__/promptShellExecution.behavior.test.ts`,
 * que asevera con `readFileSync` + regex sobre el TEXTO fuente y por tanto
 * exige coincidencia literal. Lo único sustituido son las diez
 * dependencias externas, ninguna con hogar en este árbol (DEC-04): el
 * mecanismo se porta, el parámetro del repo que lo consume no.
 *
 * Sustitutos declarados (todos locales a este archivo):
 *
 * - `Tool`, `ToolUseContext` (`@claude-code-how-works/tool-registry/Tool.js`)
 *   — tipos estructurales mínimos; se erosionan en runtime.
 * - `BashTool` (`.../tools/BashTool/BashTool.js`) — no hay registro de
 *   herramientas en este árbol; el stub declara honestamente que no
 *   ejecuta nada real (lanza) en vez de fingir una ejecución que no
 *   existe.
 * - `PowerShellTool` (`.../tools/PowerShellTool/PowerShellTool.js`) — ídem,
 *   cargado perezosamente igual que la fuente (el mecanismo lazy SÍ se
 *   porta; lo que carga, no).
 * - `logForDebugging` (`.../local-observability/debug.js`) — no-op: no
 *   hay canal de depuración centralizado aquí.
 * - `errorMessage`, `MalformedCommandError`, `ShellError`
 *   (`.../local-observability/errorHelpers.js`) — porte FIEL (son
 *   autocontenidas: una clase vacía, una clase con 4 campos, una función
 *   de una línea).
 * - `FrontmatterShell` (`@claude-code-how-works/agent/frontmatterParser.js`)
 *   — porte fiel del tipo (`'bash' | 'powershell'`, `config/frontmatterParser.ts:339`
 *   en la fuente).
 * - `createAssistantMessage` (`@claude-code-how-works/agent/messages.js`)
 *   — la fuente construye un `AssistantMessage` completo (bloques de
 *   contenido, uso de tokens, IDs); aquí sólo se necesita un contenedor
 *   opaco para pasar por la firma de `hasPermissionsToUseTool`.
 * - `hasPermissionsToUseTool` (`@claude-code-how-works/permission/permissions`)
 *   — sin sistema de permisos en este árbol, el stub permite siempre
 *   (`{ behavior: 'allow' }`); es inerte porque `BashTool`/`PowerShellTool`
 *   tampoco ejecutan nada real.
 * - `processToolResultBlock` (`@claude-code-how-works/storage/toolResultStorage.js`)
 *   — la fuente persiste el resultado y puede devolver un bloque ya
 *   procesado; el stub sólo formatea `stdout`/`stderr` con
 *   `formatBashOutput`, que es el fallback que la fuente misma usa
 *   cuando el bloque persistido no aplica (ver la rama `: formatBashOutput(...)`
 *   más abajo).
 * - `isPowerShellToolEnabled` (`@claude-code-how-works/shell/legacy/shellToolUtils.js`)
 *   — sin el opt-in real del usuario, el stub deniega siempre; el efecto
 *   es el mismo que documenta el comentario original: PowerShell nunca se
 *   activa sin que el runtime lo permita.
 */

// ---- Tipos estructurales mínimos (erosionados en runtime) ----
type ToolUseContext = Record<string, unknown>
type Tool = { name: string; [key: string]: unknown }
type FrontmatterShell = 'bash' | 'powershell'
type PermissionDecision = {
  behavior: 'allow' | 'deny' | 'ask'
  message?: string
}
type AssistantMessageStub = { content: unknown[] }

// ---- errorHelpers.ts — porte fiel (autocontenido) ----
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

class MalformedCommandError extends Error {}

class ShellError extends Error {
  constructor(
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly code: number,
    public readonly interrupted: boolean,
  ) {
    super('Shell command failed')
    this.name = 'ShellError'
  }
}

// ---- Sustitutos inertes (documentados en la cabecera del módulo) ----
function logForDebugging(_message: string): void {
  // No-op: no hay canal de depuración centralizado en este árbol.
}

function createAssistantMessage({
  content,
}: {
  content: unknown[]
}): AssistantMessageStub {
  return { content }
}

async function hasPermissionsToUseTool(
  _tool: Tool,
  _input: { command: string },
  _context: ToolUseContext,
  _assistantMessage: AssistantMessageStub,
  _toolUseID: string,
): Promise<PermissionDecision> {
  // Sin sistema de permisos en este árbol: permitir siempre. Inerte —
  // BashTool/PowerShellTool tampoco ejecutan nada real (ver abajo).
  return { behavior: 'allow' }
}

async function processToolResultBlock(
  _tool: Tool,
  data: ShellOut,
  _toolUseID: string,
): Promise<{ content: string | unknown[] }> {
  return { content: formatBashOutput(data.stdout, data.stderr) }
}

function isPowerShellToolEnabled(): boolean {
  return false
}

// Narrow structural slice both BashTool and PowerShellTool satisfy. We can't
// use the base Tool type: it marks call()'s canUseTool/parentMessage as
// required, but both concrete tools have them optional and the original code
// called BashTool.call({ command }, ctx) with just 2 args. We can't use
// `typeof BashTool` either: BashTool's input schema has fields (e.g.
// _simulatedSedEdit) that PowerShellTool's does not.
// NOTE: call() is invoked directly here, bypassing validateInput — any
// load-bearing check must live in call() itself (see PR #23311).
type ShellOut = { stdout: string; stderr: string; interrupted: boolean }
type PromptShellTool = Tool & {
  call(
    input: { command: string },
    context: ToolUseContext,
  ): Promise<{ data: ShellOut }>
}

// Sin registro de herramientas en este árbol, no hay un BashTool real que
// ejecute comandos. El stub lo declara — lanzar en vez de fingir una
// ejecución que no existe.
const BashTool: PromptShellTool = {
  name: 'Bash',
  call: async () => {
    throw new Error('BashTool no está portado en este árbol (DEC-04)')
  },
}

// Lazy: this file is on the startup import chain (main → commands →
// loadSkillsDir → here). A static import would load PowerShellTool.ts
// (and transitively parser.ts, validators, etc.) at startup on all
// platforms, defeating tools.ts's lazy require. Deferred until the
// first skill with `shell: powershell` actually runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const getPowerShellTool = (() => {
  let cached: PromptShellTool | undefined
  return (): PromptShellTool => {
    if (!cached) {
      // Sin PowerShellTool real en este árbol: mismo criterio que BashTool.
      cached = {
        name: 'PowerShell',
        call: async () => {
          throw new Error(
            'PowerShellTool no está portado en este árbol (DEC-04)',
          )
        },
      }
    }
    return cached
  }
})()
/* eslint-enable @typescript-eslint/no-require-imports */

// Pattern for code blocks: ```! command ```
const BLOCK_PATTERN = /```!\s*\n?([\s\S]*?)\n?```/g

// Pattern for inline: !`command`
// Uses a positive lookbehind to require whitespace or start-of-line before !
// This prevents false matches inside markdown inline code spans like `!!` or
// adjacent spans like `foo`!`bar`, and shell variables like $!
// eslint-disable-next-line custom-rules/no-lookbehind-regex -- gated by text.includes('!`') below (PR#22986)
const INLINE_PATTERN = /(?<=^|\s)!`([^`]+)`/gm

/**
 * Parses prompt text and executes any embedded shell commands.
 * Supports two syntaxes:
 * - Code blocks: ```! command ```
 * - Inline: !`command`
 *
 * @param shell - Shell to route commands through. Defaults to bash.
 *   This is *never* read from settings.defaultShell — it comes from .md
 *   frontmatter (author's choice) or is undefined for built-in commands.
 *   See docs/design/ps-shell-selection.md §5.3.
 */
export async function executeShellCommandsInPrompt(
  text: string,
  context: ToolUseContext,
  slashCommandName: string,
  shell?: FrontmatterShell,
): Promise<string> {
  let result = text

  // Resolve the tool once. `shell === undefined` and `shell === 'bash'` both
  // hit BashTool. PowerShell only when the runtime gate allows — a skill
  // author's frontmatter choice doesn't override the user's opt-in/out.
  const shellTool: PromptShellTool =
    shell === 'powershell' && isPowerShellToolEnabled()
      ? getPowerShellTool()
      : BashTool

  // INLINE_PATTERN's lookbehind is ~100x slower than BLOCK_PATTERN on large
  // skill content (265µs vs 2µs @ 17KB). 93% of skills have no !` at all,
  // so gate the expensive scan on a cheap substring check. BLOCK_PATTERN
  // (```!) doesn't require !` in the text, so it's always scanned.
  const blockMatches = text.matchAll(BLOCK_PATTERN)
  const inlineMatches = text.includes('!`') ? text.matchAll(INLINE_PATTERN) : []

  await Promise.all(
    [...blockMatches, ...inlineMatches].map(async match => {
      const command = match[1]?.trim()
      if (command) {
        try {
          // Check permissions before executing
          const permissionResult = await hasPermissionsToUseTool(
            shellTool,
            { command },
            context,
            createAssistantMessage({ content: [] }),
            '',
          )

          if (permissionResult.behavior !== 'allow') {
            logForDebugging(
              `Shell command permission check failed for command in ${slashCommandName}: ${command}. Error: ${permissionResult.message}`,
            )
            throw new MalformedCommandError(
              `Shell command permission check failed for pattern "${match[0]}": ${permissionResult.message || 'Permission denied'}`,
            )
          }

          const { data } = await shellTool.call({ command }, context)
          // Reuse the same persistence flow as regular Bash tool calls
          const toolResultBlock = await processToolResultBlock(
            shellTool,
            data,
            randomUUID(),
          )
          // Extract the string content from the block
          const output =
            typeof toolResultBlock.content === 'string'
              ? toolResultBlock.content
              : formatBashOutput(data.stdout, data.stderr)
          // Function replacer — String.replace interprets $$, $&, $`, $' in
          // the replacement string even with a string search pattern. Shell
          // output (especially PowerShell: $env:PATH, $$, $PSVersionTable)
          // is arbitrary user data; a bare string arg would corrupt it.
          result = result.replace(match[0], () => output)
        } catch (e) {
          if (e instanceof MalformedCommandError) {
            throw e
          }
          formatBashError(e, match[0])
        }
      }
    }),
  )

  return result
}

function formatBashOutput(
  stdout: string,
  stderr: string,
  inline = false,
): string {
  const parts: string[] = []

  if (stdout.trim()) {
    parts.push(stdout.trim())
  }

  if (stderr.trim()) {
    if (inline) {
      parts.push(`[stderr: ${stderr.trim()}]`)
    } else {
      parts.push(`[stderr]\n${stderr.trim()}`)
    }
  }

  return parts.join(inline ? ' ' : '\n')
}

function formatBashError(e: unknown, pattern: string, inline = false): never {
  if (e instanceof ShellError) {
    if (e.interrupted) {
      throw new MalformedCommandError(
        `Shell command interrupted for pattern "${pattern}": [Command interrupted]`,
      )
    }
    const output = formatBashOutput(e.stdout, e.stderr, inline)
    throw new MalformedCommandError(
      `Shell command failed for pattern "${pattern}": ${output}`,
    )
  }

  const message = errorMessage(e)
  const formatted = inline ? `[Error: ${message}]` : `[Error]\n${message}`
  throw new MalformedCommandError(formatted)
}
