/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/stubs/stubCommand.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO.
 *
 * Comando stub compartido entre los puntos de entrada con feature
 * deshabilitada. Reemplaza 17 stubs idénticos de
 * `src/commands/(name)/index.js` (ant-trace, autofix-pr,
 * backfill-sessions, break-cache, bughunter, ctx_viz, debug-tool-call,
 * env, good-claude, issue, mock-limits, oauth-refresh, onboarding,
 * perf-issue, share, summary, teleport) que eran idénticos en la fuente.
 * El registro trata los comandos `isHidden` + `isEnabled=false` como
 * ausentes, así que quien llame ve el mismo comportamiento en tiempo de
 * ejecución mientras el conteo de archivos baja en 17 — ninguno de esos
 * 17 puntos de entrada individuales se porta en este pase; se documentan
 * como reemplazados por este único archivo, siguiendo el mismo criterio
 * de la fuente.
 */
export default { isEnabled: () => false, isHidden: true, name: 'stub' }
