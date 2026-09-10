/**
 * Test de integración de writeToMailbox + el pipeline de dedup por
 * (type, requestId).
 *
 * Procedencia: `ccnmt: packages/swarm/src/__tests__/writeToMailboxIntegration.test.ts`
 * (293 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el
 * cuerpo se **reimplementa** y no se copia.
 *
 * Complementa a `writeToMailboxDedup.test.ts` (que sólo ejercita el
 * helper `extractDedupKey`) recorriendo el camino completo: lockfile,
 * E/S de archivo, decisión de dedup, escritura del archivo.
 *
 * El runtime de swarm usa un chequeo estricto en `installSwarmAppRuntime()`
 * — cada binding tiene que estar presente o la llamada lanza al primer
 * uso. El mapa de bindings se declara inline en este archivo (mismo
 * criterio que el resto de la suite de swarm); sólo las claves que esta
 * integración realmente toca reciben cuerpo funcional, el resto lanza si
 * se alcanza, para que un camino de código no intencional aflore de
 * inmediato en vez de engañar al test.
 *
 * DIVERGENCIA DECLARADA: `proper-lockfile` no era dependencia directa de
 * `@thyrox/swarm` (sólo la usan, hoy, `@thyrox/config`,
 * `@thyrox/local-observability` y `@thyrox/storage`) — en `ccnmt` resuelve
 * por hoisting del root del monorepo, que este árbol no tiene (cada
 * paquete instala aislado). Se añadió como `devDependency` (misma versión
 * que los tres hermanos: `^4.1.2` / `@types` `^4.1.4`) porque este test es
 * el único consumidor de swarm que construye el binding `lock`/`unlock`/
 * `check` con la librería real — el runtime de producción de swarm nunca
 * importa `proper-lockfile` directamente, sólo recibe esos tres nombres
 * como binding de host.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as lockfileLib from 'proper-lockfile'

import {
  _test_resetSwarmAppRuntime,
  installSwarmAppRuntime,
  SWARM_FUNCTION_BINDINGS,
  SWARM_VALUE_BINDINGS,
} from '../adapters/appRuntime.js'
import {
  createShutdownRequestMessage,
  readMailbox,
  writeToMailbox,
} from '../mailbox/index.js'

const TEAM = 'mailbox-integration-tests'
const collectedLogs: string[] = []

let teamsDir = ''

beforeAll(async () => {
  teamsDir = await mkdtemp(join(tmpdir(), 'ccb-mailbox-int-'))

  const bindings: Record<string, unknown> = {}
  for (const key of SWARM_FUNCTION_BINDINGS) {
    bindings[key] = (..._args: unknown[]) => {
      throw new Error(
        `llamada inesperada al binding de runtime de swarm "${key}" en el test de integración de buzón`,
      )
    }
  }
  for (const key of SWARM_VALUE_BINDINGS) {
    bindings[key] = ''
  }

  // Sólo los bindings que writeToMailbox/readMailbox/markMessageAsReadByIndex
  // realmente tocan reciben cuerpo funcional. El resto lanza.
  Object.assign(bindings, {
    TEAMMATE_MESSAGE_TAG: 'teammate-message',
    ERROR_MESSAGE_USER_ABORT: '',
    BASH_TOOL_NAME: 'Bash',
    SEND_MESSAGE_TOOL_NAME: 'SendMessage',
    TASK_CREATE_TOOL_NAME: 'TaskCreate',
    TASK_GET_TOOL_NAME: 'TaskGet',
    TASK_LIST_TOOL_NAME: 'TaskList',
    TASK_UPDATE_TOOL_NAME: 'TaskUpdate',
    TEAM_CREATE_TOOL_NAME: 'TeamCreate',
    TEAM_DELETE_TOOL_NAME: 'TeamDelete',
    TURN_COMPLETION_VERBS: [],
    SUBAGENT_REJECT_MESSAGE: '',
    SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX: '',
    STOPPED_DISPLAY_MS: 0,
    AGENT_COLORS: ['red', 'blue'],
    CLAUDE_OPUS_4_7_CONFIG: { name: 'test-model' },
    env: {},
    getTeamsDir: () => teamsDir,
    logForDebugging: (msg: string) => {
      collectedLogs.push(msg)
    },
    logError: () => {},
    jsonParse: JSON.parse,
    jsonStringify: JSON.stringify,
    getErrnoCode: (e: unknown) => (e as NodeJS.ErrnoException | null)?.code,
    errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
    sanitizePathComponent: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-'),
    getTeamName: () => TEAM,
    getAgentName: () => 'team-lead',
    getTeammateColor: () => 'blue',
    // Shim de proper-lockfile — las APIs de escritura/lectura usan estos
    // tres nombres para serializar.
    lock: lockfileLib.lock,
    unlock: lockfileLib.unlock,
    check: lockfileLib.check,
  })

  installSwarmAppRuntime(bindings)
})

afterAll(async () => {
  if (teamsDir) {
    await rm(teamsDir, { recursive: true, force: true })
  }
  _test_resetSwarmAppRuntime()
})

beforeEach(() => {
  collectedLogs.length = 0
})

afterEach(async () => {
  // Limpia los buzones entre tests para que el estado de dedup no se filtre.
  await rm(join(teamsDir, TEAM), { recursive: true, force: true }).catch(
    () => {},
  )
})

describe('writeToMailbox — integración completa con dedup', () => {
  test('un shutdown_request repetido con el mismo requestId se descarta en disco', async () => {
    const msg = createShutdownRequestMessage({
      requestId: 'req-stuck',
      from: 'team-lead',
      reason: 'teardown',
    })
    const env = {
      from: 'team-lead',
      text: JSON.stringify(msg),
      timestamp: '2026-04-30T00:00:00Z',
    }

    // Refleja el modo de fallo real: el líder reintenta el mismo
    // shutdown 4 veces porque el botón de la UI se machacó o un
    // handler de nivel superior reenvió sobre el mismo requestId.
    // Antes del fix esto apilaba cuatro entradas en el buzón del
    // agente fixer.
    await writeToMailbox('alice', env, TEAM)
    await writeToMailbox('alice', env, TEAM)
    await writeToMailbox('alice', env, TEAM)
    await writeToMailbox('alice', env, TEAM)

    const inbox = await readMailbox('alice', TEAM)
    expect(inbox.length).toBe(1)
    // Chequeo de cordura: el que se conservó es el original (no una
    // variante corrupta).
    expect(JSON.parse(inbox[0]!.text).requestId).toBe('req-stuck')
  })

  test('el dedup queda registrado para visibilidad', async () => {
    const msg = createShutdownRequestMessage({
      requestId: 'logged-1',
      from: 'team-lead',
    })
    const env = {
      from: 'team-lead',
      text: JSON.stringify(msg),
      timestamp: 'x',
    }
    await writeToMailbox('alice', env, TEAM)
    await writeToMailbox('alice', env, TEAM)
    const dedupedLogs = collectedLogs.filter(l => l.includes('deduped'))
    expect(dedupedLogs.length).toBeGreaterThan(0)
  })

  test('requestIds distintos aterrizan todos', async () => {
    for (let i = 0; i < 4; i++) {
      const msg = createShutdownRequestMessage({
        requestId: `req-${i}`,
        from: 'team-lead',
      })
      await writeToMailbox(
        'alice',
        {
          from: 'team-lead',
          text: JSON.stringify(msg),
          timestamp: `t${i}`,
        },
        TEAM,
      )
    }
    const inbox = await readMailbox('alice', TEAM)
    expect(inbox.length).toBe(4)
  })

  test('destinatarios distintos deduplican de forma independiente', async () => {
    const msg = createShutdownRequestMessage({
      requestId: 'broadcast-1',
      from: 'team-lead',
    })
    const env = {
      from: 'team-lead',
      text: JSON.stringify(msg),
      timestamp: 'x',
    }
    // Cada destinatario es su propio archivo de buzón; el dedup es
    // por-buzón.
    await writeToMailbox('alice', env, TEAM)
    await writeToMailbox('bob', env, TEAM)
    await writeToMailbox('alice', env, TEAM) // duplicado para alice
    await writeToMailbox('bob', env, TEAM) // duplicado para bob

    expect((await readMailbox('alice', TEAM)).length).toBe(1)
    expect((await readMailbox('bob', TEAM)).length).toBe(1)
  })

  test('los reintentos de texto plano se conservan (sin clave de dedup)', async () => {
    const env = {
      from: 'team-lead',
      text: 'check the deploy',
      timestamp: 'x',
    }
    await writeToMailbox('alice', env, TEAM)
    await writeToMailbox('alice', env, TEAM)
    expect((await readMailbox('alice', TEAM)).length).toBe(2)
  })

  test('idle_notification (sin requestId) NO se dedupea', async () => {
    // Las notificaciones de idle sólo llevan `type` — quien llama decide
    // si le importan los duplicados. El buzón no los colapsa; eso es
    // trabajo del generador del envoltorio de attachment.
    const env = {
      from: 'alice',
      text: JSON.stringify({
        type: 'idle_notification',
        from: 'alice',
        timestamp: 'x',
      }),
      timestamp: 'x',
    }
    await writeToMailbox('team-lead', env, TEAM)
    await writeToMailbox('team-lead', env, TEAM)
    expect((await readMailbox('team-lead', TEAM)).length).toBe(2)
  })

  test('escrituras concurrentes del mismo (type, requestId) colapsan a 1', async () => {
    // El lockfile tiene que serializar las escrituras; el chequeo de
    // dedup dentro de cada escritura tiene que observar a las otras.
    // Antes del fix esto entraba en carrera y dejaba 4 entradas incluso
    // con el lock, porque el chequeo de dedup no existía.
    const msg = createShutdownRequestMessage({
      requestId: 'race-1',
      from: 'team-lead',
    })
    const env = {
      from: 'team-lead',
      text: JSON.stringify(msg),
      timestamp: 'x',
    }
    await Promise.all([
      writeToMailbox('alice', env, TEAM),
      writeToMailbox('alice', env, TEAM),
      writeToMailbox('alice', env, TEAM),
      writeToMailbox('alice', env, TEAM),
    ])
    const inbox = await readMailbox('alice', TEAM)
    expect(inbox.length).toBe(1)
  })
})
