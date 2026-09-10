/**
 * Puerto fiel de `ccnmt: packages/bridge/commands/bridge-kick.ts`.
 * `Command`/`LocalCommandCall` son sólo-tipo (se borran al compilar, no
 * necesitan resolver) — se citan `@thyrox/command-runtime` y
 * `@thyrox/agent`, mismo convenio que el resto del árbol, aunque esos
 * paquetes aún no porten esos archivos exactos (`runtime.ts` /
 * `command.ts`).
 */
import { getBridgeDebugHandle } from '../src/bridgeDebug.js'
import type { Command } from '@thyrox/command-runtime/runtime.js'
import type { LocalCommandCall } from '@thyrox/agent/command.js'

/**
 * Sólo-ant: inyecta estados de falla del bridge para probar
 * manualmente los caminos de recuperación.
 *
 *   /bridge-kick close 1002            — dispara ws_closed con código 1002
 *   /bridge-kick close 1006            — dispara ws_closed con código 1006
 *   /bridge-kick poll 404              — el próximo poll lanza 404/not_found_error
 *   /bridge-kick poll 404 <type>       — el próximo poll lanza 404 con error_type
 *   /bridge-kick poll 401              — el próximo poll lanza 401 (auth)
 *   /bridge-kick poll transient        — el próximo poll lanza rechazo estilo axios
 *   /bridge-kick register fail         — el próximo register (dentro de doReconnect) falla transitoriamente
 *   /bridge-kick register fail 3       — los próximos 3 registers fallan transitoriamente
 *   /bridge-kick register fatal        — el próximo register da 403 (terminal)
 *   /bridge-kick reconnect-session fail — POST /bridge/reconnect falla (→ Strategy 2)
 *   /bridge-kick heartbeat 401         — el próximo heartbeat da 401 (JWT expirado)
 *   /bridge-kick reconnect             — llama doReconnect directamente (= SIGUSR2)
 *   /bridge-kick status                — imprime el estado actual del bridge
 *
 * Flujo: conectar Remote Control, correr un subcommand, `tail -f debug.log`
 * y observar las líneas [bridge:repl] / [bridge:debug] por la reacción de
 * recuperación.
 *
 * Secuencias compuestas — los modos de falla en los datos de BQ son
 * cadenas, no eventos únicos. Encolar fallas y luego disparar el trigger:
 *
 *   # residual de #22148: ws_closed → register falla transitoriamente → ¿teardown?
 *   /bridge-kick register fail 2
 *   /bridge-kick close 1002
 *   → esperado: doReconnect intenta register, falla, devuelve false → teardown
 *     (demuestra el gap de reintento que hace falta arreglar)
 *
 *   # Gate muerto: poll 404/not_found_error → ¿dispara onEnvironmentLost?
 *   /bridge-kick poll 404
 *   → esperado: tengu_bridge_repl_fatal_error (el gate está muerto — 147K/semana)
 *     tras el fix: tengu_bridge_repl_env_lost → doReconnect
 */

const USAGE = `/bridge-kick <subcommand>
  close <code>              fire ws_closed with the given code (e.g. 1002)
  poll <status> [type]      next poll throws BridgeFatalError(status, type)
  poll transient            next poll throws axios-style rejection (5xx/net)
  register fail [N]         next N registers transient-fail (default 1)
  register fatal            next register 403s (terminal)
  reconnect-session fail    next POST /bridge/reconnect fails
  heartbeat <status>        next heartbeat throws BridgeFatalError(status)
  reconnect                 call reconnectEnvironmentWithSession directly
  status                    print bridge state`

const call: LocalCommandCall = async args => {
  const h = getBridgeDebugHandle()
  if (!h) {
    return {
      type: 'text',
      value:
        'No bridge debug handle registered. Remote Control must be connected (USER_TYPE=ant).',
    }
  }

  const [sub, a, b] = args.trim().split(/\s+/)

  switch (sub) {
    case 'close': {
      const code = Number(a)
      if (!Number.isFinite(code)) {
        return { type: 'text', value: `close: need a numeric code\n${USAGE}` }
      }
      h.fireClose(code)
      return {
        type: 'text',
        value: `Fired transport close(${code}). Watch debug.log for [bridge:repl] recovery.`,
      }
    }

    case 'poll': {
      if (a === 'transient') {
        h.injectFault({
          method: 'pollForWork',
          kind: 'transient',
          status: 503,
          count: 1,
        })
        h.wakePollLoop()
        return {
          type: 'text',
          value:
            'Next poll will throw a transient (axios rejection). Poll loop woken.',
        }
      }
      const status = Number(a)
      if (!Number.isFinite(status)) {
        return {
          type: 'text',
          value: `poll: need 'transient' or a status code\n${USAGE}`,
        }
      }
      // Default a lo que el servidor REALMENTE envía para 404
      // (verificado por BQ), para que `/bridge-kick poll 404` reproduzca
      // el estado real de 147K/semana.
      const errorType =
        b ?? (status === 404 ? 'not_found_error' : 'authentication_error')
      h.injectFault({
        method: 'pollForWork',
        kind: 'fatal',
        status,
        errorType,
        count: 1,
      })
      h.wakePollLoop()
      return {
        type: 'text',
        value: `Next poll will throw BridgeFatalError(${status}, ${errorType}). Poll loop woken.`,
      }
    }

    case 'register': {
      if (a === 'fatal') {
        h.injectFault({
          method: 'registerBridgeEnvironment',
          kind: 'fatal',
          status: 403,
          errorType: 'permission_error',
          count: 1,
        })
        return {
          type: 'text',
          value:
            'Next registerBridgeEnvironment will 403. Trigger with close/reconnect.',
        }
      }
      const n = Number(b) || 1
      h.injectFault({
        method: 'registerBridgeEnvironment',
        kind: 'transient',
        status: 503,
        count: n,
      })
      return {
        type: 'text',
        value: `Next ${n} registerBridgeEnvironment call(s) will transient-fail. Trigger with close/reconnect.`,
      }
    }

    case 'reconnect-session': {
      h.injectFault({
        method: 'reconnectSession',
        kind: 'fatal',
        status: 404,
        errorType: 'not_found_error',
        count: 2,
      })
      return {
        type: 'text',
        value:
          '@claude-code-how-works/bridge/reconnect calls will 404. doReconnect Strategy 1 falls through to Strategy 2.',
      }
    }

    case 'heartbeat': {
      const status = Number(a) || 401
      h.injectFault({
        method: 'heartbeatWork',
        kind: 'fatal',
        status,
        errorType: status === 401 ? 'authentication_error' : 'not_found_error',
        count: 1,
      })
      return {
        type: 'text',
        value: `Next heartbeat will ${status}. Watch for onHeartbeatFatal → work-state teardown.`,
      }
    }

    case 'reconnect': {
      h.forceReconnect()
      return {
        type: 'text',
        value: 'Called reconnectEnvironmentWithSession(). Watch debug.log.',
      }
    }

    case 'status': {
      return { type: 'text', value: h.describe() }
    }

    default:
      return { type: 'text', value: USAGE }
  }
}

const bridgeKick = {
  type: 'local',
  name: 'bridge-kick',
  description: 'Inject bridge failure states for manual recovery testing',
  isEnabled: () => process.env.USER_TYPE === 'ant',
  supportsNonInteractive: false,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default bridgeKick
