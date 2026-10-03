/**
 * Coordinación sobre Redis para la topología `shared`. La generación de cada
 * residencia vive en Redis junto a su lease y sube en la misma operación
 * atómica que lo adquiere; una caída de Redis devuelve `unavailable`, nunca un
 * lease local.
 *
 * Por residencia hay tres claves: el lease de propiedad (hash `owner` y
 * `generation`, con TTL), la generación (entero SIN TTL, sube con `INCR`) y el
 * lock de mutación (hash con TTL, atado a la generación con la que se
 * concedió). Cada operación es un script Lua (`EVAL`): ningún otro
 * coordinador se intercala entre comprobar la vigencia y escribir.
 */
import type {
  GenerationLease,
  LeaseAcquisition,
  LeaseValidity,
  ModelSchedulingCoordination,
  MutationOperation,
} from './coordination.ts'

export interface RedisCoordinationOptions {
  /** Se antepone a toda clave, para compartir un servidor sin chocar. */
  readonly keyPrefix?: string
}

/**
 * Un lease (`KEYS[1]`) es vigente si su dueño y su generación son `ARGV[1]` y
 * `ARGV[2]` y esa generación es la de la residencia (`KEYS[2]`). Un hash
 * caducado no existe, así que la caducidad queda dentro de la misma lectura.
 */
const IS_CURRENT_FUNCTION = `
local function isCurrent(leaseKey, generationKey, owner, generation)
  local fields = redis.call("HMGET", leaseKey, "owner", "generation")
  return fields[1] == owner and fields[2] == generation and redis.call("GET", generationKey) == generation
end
`

/** Ocupada → `{"held", dueño}`; libre → sube la generación y la devuelve con `{"acquired", n}`. */
const ACQUIRE_RESIDENCY_SCRIPT = `
local holder = redis.call("HGET", KEYS[1], "owner")
if holder then return {"held", holder} end
local generation = redis.call("INCR", KEYS[2])
redis.call("HSET", KEYS[1], "owner", ARGV[1], "generation", generation)
redis.call("PEXPIRE", KEYS[1], ARGV[2])
return {"acquired", generation}
`

/** `KEYS[3]` es el lock de mutación; `KEYS[1]`, la propiedad que lo pide. */
const ACQUIRE_MUTATION_SCRIPT = `${IS_CURRENT_FUNCTION}
if not isCurrent(KEYS[1], KEYS[2], ARGV[1], ARGV[2]) then
  return {"stale", tonumber(redis.call("GET", KEYS[2]) or "0")}
end
local held = redis.call("HMGET", KEYS[3], "owner", "generation")
if held[1] and held[2] == ARGV[2] then return {"held", held[1]} end
redis.call("DEL", KEYS[3])
redis.call("HSET", KEYS[3], "owner", ARGV[1], "generation", ARGV[2], "operation", ARGV[4])
redis.call("PEXPIRE", KEYS[3], ARGV[3])
return {"acquired", tonumber(ARGV[2])}
`

/** Devuelve 1 si el lease es vigente, 0 si no. */
const VALIDITY_SCRIPT = `${IS_CURRENT_FUNCTION}
if isCurrent(KEYS[1], KEYS[2], ARGV[1], ARGV[2]) then return 1 end
return 0
`

/** Extiende el TTL (`ARGV[3]`) sólo si el lease es vigente; 1 si lo hizo. */
const RENEW_SCRIPT = `${IS_CURRENT_FUNCTION}
if isCurrent(KEYS[1], KEYS[2], ARGV[1], ARGV[2]) then
  redis.call("PEXPIRE", KEYS[1], ARGV[3])
  return 1
end
return 0
`

/** Borra el lease sólo si es vigente; 1 si lo hizo. La generación no se toca. */
const RELEASE_SCRIPT = `${IS_CURRENT_FUNCTION}
if isCurrent(KEYS[1], KEYS[2], ARGV[1], ARGV[2]) then
  redis.call("DEL", KEYS[1])
  return 1
end
return 0
`

const SCRIPT_TRUE = 1
const NEVER_ACQUIRED_GENERATION = 0
const ACQUIRED_REPLY = 'acquired'
const HELD_REPLY = 'held'
const STALE_REPLY = 'stale'

class UnexpectedScriptReplyError extends Error {
  constructor(script: string, reply: unknown) {
    super(`respuesta inesperada de Redis en ${script}: ${JSON.stringify(reply)}`)
    this.name = 'UnexpectedScriptReplyError'
  }
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isTaggedReply(reply: unknown): reply is [string, string | number] {
  return Array.isArray(reply) && reply.length === 2 && typeof reply[0] === 'string'
}

function validityFromFlag(flag: unknown): LeaseValidity {
  return flag === SCRIPT_TRUE ? 'current' : 'stale'
}

export function createRedisCoordination(url: string, options: RedisCoordinationOptions = {}): ModelSchedulingCoordination {
  const keyPrefix = options.keyPrefix ?? ''
  const client = new Bun.RedisClient(url, { autoReconnect: false, enableOfflineQueue: false })

  function leaseKey(residencyKey: string): string {
    return `${keyPrefix}${residencyKey}:lease`
  }

  function generationKey(residencyKey: string): string {
    return `${keyPrefix}${residencyKey}:generation`
  }

  function mutationKey(residencyKey: string): string {
    return `${keyPrefix}${residencyKey}:mutation`
  }

  function keyOf(lease: GenerationLease): string {
    return lease.kind === 'residency' ? leaseKey(lease.residencyKey) : mutationKey(lease.residencyKey)
  }

  /**
   * Sin cola offline un comando enviado antes de conectar se rechaza, así que
   * se conecta primero; si el servidor no está, `connect` lanza y quien llama
   * lo traduce a `unavailable`.
   */
  async function connected(): Promise<Bun.RedisClient> {
    if (!client.connected) await client.connect()
    return client
  }

  async function evaluate(script: string, keys: readonly string[], args: readonly string[]): Promise<unknown> {
    return (await connected()).send('EVAL', [script, String(keys.length), ...keys, ...args])
  }

  /** Corre un script sobre un lease vigente (`owner`, `generation` y extras). */
  async function evaluateOnLease(script: string, lease: GenerationLease, extraArgs: readonly string[]): Promise<LeaseValidity> {
    try {
      const keys = [keyOf(lease), generationKey(lease.residencyKey)]
      return validityFromFlag(await evaluate(script, keys, [lease.owner, String(lease.generation), ...extraArgs]))
    } catch {
      return 'unavailable'
    }
  }

  function acquisitionFrom(script: string, reply: unknown, granted: (generation: number) => GenerationLease): LeaseAcquisition {
    if (!isTaggedReply(reply)) throw new UnexpectedScriptReplyError(script, reply)
    const [tag, value] = reply
    if (tag === ACQUIRED_REPLY) return { status: 'acquired', lease: granted(Number(value)) }
    if (tag === HELD_REPLY) return { status: 'held', holder: String(value) }
    if (tag === STALE_REPLY) return { status: 'stale', currentGeneration: Number(value) }
    throw new UnexpectedScriptReplyError(script, reply)
  }

  return {
    topology: 'shared',

    async acquireResidency(residencyKey, owner, ttlMs) {
      try {
        const reply = await evaluate(ACQUIRE_RESIDENCY_SCRIPT, [leaseKey(residencyKey), generationKey(residencyKey)], [owner, String(ttlMs)])
        return acquisitionFrom('acquireResidency', reply, generation => ({ kind: 'residency', residencyKey, owner, generation }))
      } catch (error) {
        return { status: 'unavailable', reason: reasonOf(error) }
      }
    },

    renew(lease, ttlMs) {
      return evaluateOnLease(RENEW_SCRIPT, lease, [String(ttlMs)])
    },

    validity(lease) {
      return evaluateOnLease(VALIDITY_SCRIPT, lease, [])
    },

    release(lease) {
      return evaluateOnLease(RELEASE_SCRIPT, lease, [])
    },

    async acquireMutation(residency, operation: MutationOperation, ttlMs) {
      const { residencyKey, owner } = residency
      try {
        const keys = [leaseKey(residencyKey), generationKey(residencyKey), mutationKey(residencyKey)]
        const reply = await evaluate(ACQUIRE_MUTATION_SCRIPT, keys, [owner, String(residency.generation), String(ttlMs), operation])
        return acquisitionFrom('acquireMutation', reply, generation => ({ kind: 'mutation', residencyKey, owner, generation }))
      } catch (error) {
        return { status: 'unavailable', reason: reasonOf(error) }
      }
    },

    async currentGeneration(residencyKey) {
      try {
        const generation = await (await connected()).get(generationKey(residencyKey))
        return generation === null ? NEVER_ACQUIRED_GENERATION : Number(generation)
      } catch {
        return 'unavailable'
      }
    },

    async close() {
      client.close()
    },
  }
}
