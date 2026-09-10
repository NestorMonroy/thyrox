/**
 * `--import-tasks` (T-062): las casillas de un `tareas-<slug>.rst` al tablero.
 *
 * Extraído de `bin/harness.ts` en #205 sin cambio de conducta. Ver el
 * docstring de `commands/checkPremises.ts` para la forma del reparto.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseRstTasks } from '../../../../task/rst.ts'
import { taskTools } from '@thyrox/tools/tasks'
import { flag, hasFlag } from '../entry/flags.ts'

export async function importTasksCommand(argv: string[], cwd: string): Promise<number> {
  const rst = flag(argv, 'rst')
  if (!rst) {
    process.stderr.write(
      'Falta `--rst <archivo.rst>`: el puente lee un `tareas-<slug>.rst` concreto. ' +
        'Adivinar la iniciativa por convención importaría el archivo equivocado en silencio.\n',
    )
    return 2
  }
  const db = flag(argv, 'db') ?? join(cwd, '.claude', 'agent-results', 'agent_store.sqlite3')
  let texto: string
  try {
    texto = readFileSync(rst, 'utf8')
  } catch {
    process.stderr.write(`No se pudo leer ${rst}\n`)
    return 2
  }

  const leidas = parseRstTasks(texto)
  const pendientes = leidas.filter((t) => !t.done)
  const seco = hasFlag(argv, 'dry-run')
  const herramientas = taskTools({ dbPath: db, sessionId: 'import' })
  const crear = herramientas.find((t) => t.name === 'TaskCreate')!
  const listar = herramientas.find((t) => t.name === 'TaskList')!
  // El importador de RST no corre en una sesión: no hay hilo, y las task
  // tools lo ignoran. `messages` va vacío por eso, no por omisión.
  const ctx = { cwd, sessionId: 'import', abort: new AbortController().signal, messages: [] }

  /** El id del RST tal como el asunto lo lleva de prefijo. */
  const idDelAsunto = (asunto: string) => asunto.split(' — ')[0]!.trim()

  const yaEstan = seco
    ? new Set<string>()
    : new Set(
        (JSON.parse((await listar.run({ limit: 10000 }, ctx)).content) as { subject: string }[]).map((t) =>
          idDelAsunto(t.subject),
        ),
      )

  let importadas = 0
  for (const tarea of pendientes) {
    const asunto = `${tarea.id} — ${tarea.subject}`
    if (yaEstan.has(tarea.id)) continue
    if (!seco) {
      await crear.run(
        {
          subject: asunto,
          description: `Importada de ${rst}:${tarea.line}. Su condición de cierre vive en el RST.`,
        },
        ctx,
      )
    }
    yaEstan.add(tarea.id)
    importadas++
  }

  process.stdout.write(`· importadas: ${importadas} de ${pendientes.length} pendientes (${leidas.length} casillas leídas)\n`)
  process.stdout.write(`· Métrica: casillas \`- [ ]\` de ${rst}, con su id y su asunto recompuesto.\n`)
  process.stdout.write(
    '· Ciega a: la asociación que el RST no declara — el formato no tiene columna de bloqueo, ' +
      'y sólo 14 entradas del corpus la nombran en prosa; y al estado `in_progress`, que la casilla no distingue.\n',
  )
  if (seco) process.stdout.write('· --dry-run: nada se escribió en el tablero.\n')
  return 0
}
