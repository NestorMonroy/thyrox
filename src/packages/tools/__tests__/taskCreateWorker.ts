/**
 * Un proceso `TaskCreate`: espera un archivo-barrera y crea `count` tareas en
 * `sessionId`, sobre el mismo SQLite que otros procesos hermanos. Lo usa
 * `taskSessionHighwater.test.ts` para medir (y, con el arreglo retirado,
 * reproducir) la colisión de `asignarId` entre creaciones concurrentes de una
 * misma sesión (TASK-THYROX-0311).
 *
 * Uso: `bun run taskCreateWorker.ts <dbPath> <sessionId> <barrierFile> <count> <workerId>`
 * Imprime una línea JSON por resultado: `{ok:true, task_id}` o `{ok:false, error}`.
 */
import { taskTools } from '../src/tasks.ts'
import type { ToolContext } from '@thyrox/agent/loop/types'

const [dbPath, sessionId, barrierFile, countArg, workerId] = process.argv.slice(2)
const count = Number(countArg)

const context: ToolContext = { cwd: process.cwd(), sessionId: sessionId!, abort: new AbortController().signal, messages: [] }

async function waitForBarrier(): Promise<void> {
  while (!(await Bun.file(barrierFile!).exists())) await new Promise((r) => setTimeout(r, 2))
}

async function main(): Promise<void> {
  await waitForBarrier()
  const create = taskTools({ dbPath: dbPath!, sessionId }).find((t) => t.name === 'TaskCreate')!
  for (let i = 0; i < count; i++) {
    try {
      const res = await create.run({ subject: `w${workerId}-${i}` }, context)
      console.log(JSON.stringify({ ok: !res.isError, worker: workerId, ...JSON.parse(res.content) }))
    } catch (error) {
      console.log(JSON.stringify({ ok: false, worker: workerId, error: error instanceof Error ? error.message : String(error) }))
    }
  }
}

await main()
