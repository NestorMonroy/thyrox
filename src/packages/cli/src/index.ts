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
// `src/entry/main.ts` de este mismo paquete — se llamaba `bin/harness.ts`
// hasta #205.
export {
  OUTPUT_STYLES, renderEvent, renderStatusLine,
  type OutputStyle, type StatusLine,
} from './render.ts'
export { resumeChoices, type ResumeChoice } from './resume.ts'

// El selector de pruebas por impacto (#226 tramo 7): llego aqui porque su
// unico consumidor es el punto de entrada, que se mudo en el tramo 6 y hoy
// es `src/entry/main.ts`. No toca
// disco — recibe un `Io`, y `fsIo` es la implementacion que si lo toca.
export { selectTests, type ImpactConfig, type Io } from './testing/impact.ts'
export { changedPaths, fsIo } from './testing/io.ts'
