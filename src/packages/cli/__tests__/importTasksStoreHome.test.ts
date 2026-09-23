/**
 * `--import-tasks` resuelve el store por el localizador, no por `cwd`.
 *
 * H-THYROX-41. Componía `join(cwd, '.claude', 'agent-results', …)`: sin pasar
 * por ninguna de las cuatro precedencias que `storePath()` declara, y hacia el
 * hogar que `LEGACY_CONSUMER_STORE_DIR` dice NO ser destino de escritura.
 * Como `connect()` hace `mkdir` sin condición, un `cwd` equivocado no falla —
 * crea una cáscara vacía y la deja ahí.
 *
 * EL CONTROL QUE DISCRIMINA no es «la ruta es la esperada»: es que **cambiar
 * `cwd` no cambie el destino** mientras el localizador no cambie. Una versión
 * que siguiera componiendo por `cwd` pasaría cualquier aserción de forma, y
 * fallaría ésta.
 */
import { describe, expect, test, afterEach } from 'bun:test'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolveTaskStore } from '../src/commands/importTasks.ts'
import { STORE_DIR, STORE_FILE, storePath } from '@thyrox/observability/store'

const CONSUMER_ROOT_VAR = 'THYROX_CONSUMER'
const STORE_PATH_VAR = 'THYROX_STORE'
const previo = process.env[CONSUMER_ROOT_VAR]
const previoStore = process.env[STORE_PATH_VAR]

afterEach(() => {
  if (previo === undefined) delete process.env[CONSUMER_ROOT_VAR]
  else process.env[CONSUMER_ROOT_VAR] = previo
  if (previoStore === undefined) delete process.env[STORE_PATH_VAR]
  else process.env[STORE_PATH_VAR] = previoStore
})

describe('resolveTaskStore — el localizador, no el cwd', () => {
  test('lo pasado a mano gana sobre todo', () => {
    expect(resolveTaskStore('/a/mano.sqlite3', '/cualquier/cwd')).toBe('/a/mano.sqlite3')
  })

  test('sin `--db`, delega en storePath()', () => {
    delete process.env[CONSUMER_ROOT_VAR]
    expect(resolveTaskStore(undefined, '/cualquier/cwd')).toBe(storePath())
  })

  test('DOS cwd distintos dan el MISMO destino', () => {
    delete process.env[CONSUMER_ROOT_VAR]
    const uno = mkdtempSync(join(tmpdir(), 'cwd-uno-'))
    const dos = mkdtempSync(join(tmpdir(), 'cwd-dos-'))
    expect(resolveTaskStore(undefined, uno)).toBe(resolveTaskStore(undefined, dos))
  })

  test('el consumidor declarado manda, y NO al hogar heredado', () => {
    const consumidor = mkdtempSync(join(tmpdir(), 'consumidor-'))
    // El caso mide el peldaño del CONSUMIDOR, así que retira el de arriba:
    // `THYROX_STORE` gana sobre él, y el preload del store
    // (`tests/preload/store.ts`) lo fija en cada ejecución de bun.
    delete process.env[STORE_PATH_VAR]
    process.env[CONSUMER_ROOT_VAR] = consumidor
    const destino = resolveTaskStore(undefined, '/cualquier/cwd')
    expect(destino).toBe(join(consumidor, STORE_DIR, STORE_FILE))
    expect(destino).not.toContain('.claude')
  })
})
