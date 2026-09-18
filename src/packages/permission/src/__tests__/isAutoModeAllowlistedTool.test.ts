/**
 * Copia de `ccnmt: packages/permission/src/__tests__/isAutoModeAllowlistedTool.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Tests de `isAutoModeAllowlistedTool` — el camino rápido, crítico para la
 * seguridad, del clasificador de modo automático. Una herramienta en la lista
 * de permitidos se salta por completo las comprobaciones del clasificador, sin
 * ida y vuelta al LLM por llamada.
 *
 * Una lista de permitidos equivocada produce una de dos cosas:
 *   - Añade una herramienta insegura: el clasificador no la ve nunca y se
 *     saltan decisiones de seguridad reales (añadir Bash aquí, por ejemplo,
 *     dejaría correr cualquier comando sin vigilancia en modo automático).
 *   - Deja caer una herramienta segura: el clasificador se consulta en cada
 *     llamada, y eso dispara la latencia y el gasto de tokens.
 *
 * El conjunto es cerrado por diseño — una herramienta futura añadida sin
 * intención explícita NO debe aparecer aquí. Los tests dejan bajo llave la
 * pertenencia, para que un refactor de «simplificar» no la ensanche en
 * silencio.
 */
import { describe, expect, test } from 'bun:test'
import { isAutoModeAllowlistedTool } from '../classifierDecision.js'

describe('isAutoModeAllowlistedTool — known safe tools (allowlist)', () => {
  test.each([
    'Read', // FILE_READ_TOOL_NAME
    'Grep', // GREP_TOOL_NAME
    'Glob', // GLOB_TOOL_NAME
    'LSP', // LSP_TOOL_NAME
    'ToolSearch', // TOOL_SEARCH_TOOL_NAME
    'ListMcpResourcesTool', // LIST_MCP_RESOURCES_TOOL_NAME (note: full name)
    'ReadMcpResourceTool', // hardcoded string in classifierDecision
    'TodoWrite',
    'TaskCreate',
    'TaskGet',
    'TaskUpdate',
    'TaskList',
    'TaskStop',
    'TaskOutput',
    'AskUserQuestion',
    'EnterPlanMode',
    'ExitPlanMode',
    'TeamCreate',
    'TeamDelete',
    'SendMessage',
    'Sleep',
    'classify_result', // YOLO_CLASSIFIER_TOOL_NAME
  ])('"%s" → true (in allowlist)', toolName => {
    expect(isAutoModeAllowlistedTool(toolName)).toBe(true)
  })
})

describe('isAutoModeAllowlistedTool — write/edit tools NOT in allowlist', () => {
  test.each(['Bash', 'Edit', 'Write', 'NotebookEdit'])(
    '"%s" → false (must go through classifier)',
    toolName => {
      expect(isAutoModeAllowlistedTool(toolName)).toBe(false)
    },
  )
})

describe('isAutoModeAllowlistedTool — unknown / made-up names', () => {
  test('empty string → false', () => {
    expect(isAutoModeAllowlistedTool('')).toBe(false)
  })

  test('undefined-ish strings → false', () => {
    expect(isAutoModeAllowlistedTool('undefined')).toBe(false)
    expect(isAutoModeAllowlistedTool('null')).toBe(false)
  })

  test('case-sensitive: lowercase variants do NOT match', () => {
    // Los nombres de herramienta son cadenas exactas; en minúscula no casan.
    expect(isAutoModeAllowlistedTool('grep')).toBe(false)
    expect(isAutoModeAllowlistedTool('todowrite')).toBe(false)
  })

  test('hypothetical future tool name → false', () => {
    expect(isAutoModeAllowlistedTool('SomeFutureTool')).toBe(false)
  })

  test('MCP tool with mcp__ prefix → false (not allowlisted)', () => {
    // Las herramientas de MCP las controla el usuario: tienen que pasar por el clasificador.
    expect(isAutoModeAllowlistedTool('mcp__github__list_issues')).toBe(false)
    expect(isAutoModeAllowlistedTool('mcp__filesystem__write_file')).toBe(false)
  })
})

describe('isAutoModeAllowlistedTool — boundary cases', () => {
  test('exact substring of allowlisted tool does NOT match', () => {
    // 'Read' está en la lista de permitidos; 'ReadX' no debería estarlo.
    expect(isAutoModeAllowlistedTool('ReadX')).toBe(false)
    expect(isAutoModeAllowlistedTool('XRead')).toBe(false)
  })

  test('whitespace around name does NOT trim-match', () => {
    expect(isAutoModeAllowlistedTool(' Read ')).toBe(false)
    expect(isAutoModeAllowlistedTool('\tRead')).toBe(false)
  })

  test('repeated calls return same result (pure function)', () => {
    expect(isAutoModeAllowlistedTool('Read')).toBe(true)
    expect(isAutoModeAllowlistedTool('Read')).toBe(true)
    expect(isAutoModeAllowlistedTool('Bash')).toBe(false)
    expect(isAutoModeAllowlistedTool('Bash')).toBe(false)
  })
})
