/**
 * `@thyrox/cli` — punto de entrada del paquete (TASK-DOCS-0205).
 *
 * Ver `README.md` para el alcance de este pase y lo que queda pendiente.
 */
export { EXIT_CODE, EXIT_CONFLICT, EXIT_FAIL, EXIT_OK, EXIT_USAGE, exitCodeName } from './exitCodes.ts'
export type { ExitCode } from './exitCodes.ts'
export { eagerParseCliFlag, extractArgsAfterDoubleDash } from './argv.ts'

// El hogar de la CLI del harness (#226 tramo 6): el dibujo del flujo de
// eventos y el selector de reanudacion. El binario que los usa vive en
// `bin/harness.ts` de este mismo paquete.
export {
  OUTPUT_STYLES, renderEvent, renderStatusLine,
  type OutputStyle, type StatusLine,
} from './render.ts'
export { resumeChoices, type ResumeChoice } from './resume.ts'
