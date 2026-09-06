/**
 * `@thyrox/cli` — punto de entrada del paquete (TASK-DOCS-0205).
 *
 * Ver `README.md` para el alcance de este pase y lo que queda pendiente.
 */
export { EXIT_CODE, EXIT_CONFLICT, EXIT_FAIL, EXIT_OK, EXIT_USAGE, exitCodeName } from './exitCodes.ts'
export type { ExitCode } from './exitCodes.ts'
export { eagerParseCliFlag, extractArgsAfterDoubleDash } from './argv.ts'
