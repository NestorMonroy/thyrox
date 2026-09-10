/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/storage/src/editor.ts`.
 *
 * La fuente exporta tres símbolos: `classifyGuiEditor`,
 * `openFileInExternalEditor`, `getExternalEditor` (más los helpers privados
 * `isCommandAvailable`, `guiGotoArgv` y las constantes de módulo
 * `GUI_EDITORS`, `PLUS_N_EDITORS`, `VSCODE_FAMILY`). Este archivo porta solo
 * lo que `classifyGuiEditor.test.ts` ejercita:
 *
 *   - `classifyGuiEditor` — portada VERBATIM. Es puramente sintáctica
 *     (`basename` + substring match sobre `GUI_EDITORS`), sin dependencia
 *     externa.
 *   - `GUI_EDITORS` — la constante de módulo de la que depende, portada
 *     VERBATIM (mismo orden, mismos diez nombres).
 *
 * Quedan SIN portar, por divergencia de alcance declarada:
 *
 *   - `openFileInExternalEditor` — depende de `child_process.spawn`/
 *     `spawnSync`, de `@anthropic/ink` (`instances`, alt-screen del REPL) y
 *     de `@claude-code-how-works/local-observability/debug.js`; ninguno de
 *     los tres existe en este árbol.
 *   - `getExternalEditor` — depende de `lodash-es/memoize.js` (no instalada
 *     aquí — ver `internal/pendingCrossPackageDeps.ts` para el criterio de
 *     cuándo se sustituye) y de `@claude-code-how-works/shell/which.js`
 *     (paquete `shell`, no existe en este árbol).
 *   - `isCommandAvailable`, `guiGotoArgv` — privados de las dos anteriores;
 *     sin receptor sin ellas.
 *   - `PLUS_N_EDITORS`, `VSCODE_FAMILY` — constantes que sólo consume
 *     `openFileInExternalEditor`/`guiGotoArgv`.
 *
 * Ninguno de esos símbolos lo ejercita `classifyGuiEditor.test.ts` — es la
 * única suite asignada a este agente sobre este archivo.
 */

import { basename } from 'path'

// Editores GUI que abren en una ventana separada y pueden lanzarse
// "detached" sin pelear por el stdin de la TUI. Los forks de VS Code
// (cursor, windsurf, codium) se listan explícitamente porque ninguno
// contiene 'code' como substring.
const GUI_EDITORS = [
  'code',
  'cursor',
  'windsurf',
  'codium',
  'subl',
  'atom',
  'gedit',
  'notepad++',
  'notepad',
]

/**
 * Clasifica el editor como GUI o no. Devuelve el nombre de familia GUI
 * emparejado (para la selección de argv de goto-line), o `undefined` para
 * editores de terminal.
 * Nota: esto es sólo clasificación — el binario real del usuario se lanza
 * aparte, no este valor de retorno, así que `code-insiders` / rutas
 * absolutas se preservan.
 *
 * Usa `basename` para que `/home/alice/code/bin/nvim` no empareje con
 * 'code' vía el componente de directorio. `code-insiders` → sigue
 * emparejando 'code'; `/usr/bin/code` → 'code' → empareja.
 */
export function classifyGuiEditor(editor: string): string | undefined {
  const base = basename(editor.split(' ')[0] ?? '')
  return GUI_EDITORS.find(g => base.includes(g))
}
