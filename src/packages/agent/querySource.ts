/**
 * Origen de una consulta al modelo: `repl_main_thread`, `sdk`, `compact`,
 * `agent:custom`, `session_memory`, ...
 *
 * La fuente lo deja como stub (`export type QuerySource = unknown`, marcado
 * «replace with real implementation»). Aquí es `string`, que es como lo usa
 * todo el árbol —`startsWith('repl_main_thread')`, `=== 'sdk'`— y como ya lo
 * declara `provider` (`internal/legacyRuntimeSupport.ts`). Con `unknown`,
 * cada `!querySource || querySource.startsWith(...)` lo estrechaba a `{}`.
 */
export type QuerySource = string
