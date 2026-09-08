/**
 * `--check-premises` (T-056): mide las premisas declaradas contra el árbol.
 *
 * Extraído de `bin/harness.ts` en #205 sin cambio de conducta: el binario
 * fundía sus siete comandos en una cascada de `argv.includes`, y la referencia
 * los reparte en `commands/` (ccnmt: packages/cli/src/commands/). Lo único que
 * cambia es de dónde sale el valor de una bandera — `flag()`, que reconoce
 * además `--x=v`; ver `entry/flags.ts`.
 */
import { assessAll, type TaskPremise } from '../../../../task/premises.ts'
import { fsPremiseIo, readPremises } from '../../../../task/io.ts'
import { flag, hasFlag } from '../entry/flags.ts'

export function checkPremisesCommand(argv: string[], cwd: string): number {
  const path = flag(argv, 'premises')
  if (!path) {
    // NO se adivina una ruta por convención: un archivo inventado que no está
    // daría un reporte vacío que se lee como «ninguna tarea tiene defectos».
    process.stderr.write(
      'Falta `--premises <archivo.json>`: las premisas se declaran, no se ' +
        'infieren del texto de la tarea. Inferirlas daría un veredicto que ' +
        'parece medido siendo adivinado.\n',
    )
    return 2
  }
  let declaradas: TaskPremise[]
  try {
    const crudo = readPremises(path)
    if (!Array.isArray(crudo)) throw new Error('se esperaba un arreglo de tareas')
    declaradas = crudo as TaskPremise[]
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    return 2
  }

  const reporte = assessAll(declaradas, fsPremiseIo(cwd))
  const ancho = Math.max(2, ...reporte.assessments.map((a) => a.id.length))
  for (const a of reporte.assessments) {
    process.stdout.write(`${a.id.padEnd(ancho)}  ${a.verdict.padEnd(12)}  ${a.reason}\n`)
  }
  // El denominador va SIEMPRE: un conteo sin universo no es un resultado.
  process.stdout.write(`· alcance: ${reporte.measured} de ${reporte.total} tareas medidas\n`)
  process.stdout.write(
    `· Métrica: predicados declarados por tarea, evaluados contra el árbol de ${cwd}.\n`,
  )
  process.stdout.write(
    '· Ciega a: toda premisa que la tarea no declaró — el mecanismo evalúa, no infiere; ' +
      'y a un predicado que se cumple por una razón distinta de la que la tarea supuso.\n',
  )
  // `stale` sale 1 con `--strict` por la misma razón que `overclaimed`: las dos
  // dicen que el enunciado no describe el árbol. `unmeasurable` NO — el
  // silencio del instrumento no es un defecto del código, y castigarlo
  // empujaría a declarar premisas falsas por pasar.
  if (hasFlag(argv, 'strict') && reporte.byVerdict.overclaimed + reporte.byVerdict.stale > 0) return 1
  return 0
}
