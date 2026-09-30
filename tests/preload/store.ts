/**
 * El grifo del store para `bun test`: una suite no escribe en el store
 * VERSIONADO del proveedor.
 *
 * El defecto (H-THYROX-164). `@thyrox/agent: loop/index.ts:211,677` resuelve el
 * destino como `persistCleared ?? STORE_PATH`, y `STORE_PATH` se resuelve al
 * importar el modulo: sin `THYROX_STORE`, es `agent-results/agent_store.sqlite3`
 * del proveedor, que esta versionado. Medido: correr solo
 * `contextPressure.test.ts` cambiaba el sha1 del store y le sumaba filas de
 * fixture, y el siguiente commit las arrastraba.
 *
 * Por que un preload y no editar las suites. Es la misma forma que
 * `tmpdir.ts` ya fijo para `/tmp`: redirigir la variable cubre a todas las
 * suites por construccion, incluida la que todavia no existe.
 *
 * Por que una COPIA y no un archivo vacio. Varias suites
 * (`observability.test.ts`, `subagent.test.ts`) abren el store real en solo
 * lectura para copiar su esquema: un archivo vacio les quitaria la tabla que
 * leen. La copia conserva el esquema y los datos, y las escrituras caen en ella.
 *
 * Y se MIGRA tras copiarse: el archivo versionado avanza su ledger sólo
 * cuando una sesión real lo abre, así que puede quedar detrás del código de
 * HOY. DEC-TASK 2026-09-29 hace a Python el dueño del schema — todo escritor
 * (`tasks.ts::conBase`, `@thyrox/observability`) rehúsa contra un ledger
 * incompleto, así que la copia tiene que llegar ya al día, igual que
 * `createMigratedTaskDb` para un fixture nuevo.
 *
 * La copia vive en el `TMPDIR` que `tmpdir.ts` —que corre ANTES, por el orden
 * de `bunfig.toml`— ya declaro de la ejecucion, y se retira con el.
 *
 * La guarda: si el llamador ya fijo `THYROX_STORE`, gana su decision y este
 * modulo no hace nada.
 *
 * `bun test` lee sólo el `bunfig.toml` del cwd, así que cada paquete con
 * pruebas declara en el suyo estos mismos preloads: sin eso, una suite corrida
 * desde el directorio del paquete escribiría en el store versionado.
 *
 * `root` se deriva de la propia ubicación del archivo, NO de `thyroxRoot()`:
 * un `THYROX_ROOT` heredado del entorno (p. ej. de un orquestador que fija
 * la raíz del proveedor para otro propósito) apuntaría la migración al
 * `agent_store.py` de OTRO árbol, no al de este worktree.
 *
 * Ciega a: una suite de Python o de shell, que no pasa por este preload, y a
 * una suite que abra el store por una ruta literal en vez de `STORE_PATH`.
 * Su control vive en `tests/session/test-store-faucet.sh`.
 */
import { copyFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STORE_VAR = 'THYROX_STORE'

const root = join(import.meta.dir, '..', '..')
const providerStore = join(root, 'agent-results', 'agent_store.sqlite3')

const declared = process.env[STORE_VAR]

if ((declared === undefined || declared === '') && existsSync(providerStore)) {
  const copy = join(tmpdir(), 'agent_store.sqlite3')
  copyFileSync(providerStore, copy)
  const proc = Bun.spawnSync([join(root, 'bin', 'agent_store'), 'migrate-file', copy], {
    env: { ...process.env, THYROX_ROOT: root },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (proc.exitCode !== 0) {
    throw new Error(`no se pudo migrar la copia del store en ${copy}: ${proc.stderr.toString()}`)
  }
  process.env[STORE_VAR] = copy
}
