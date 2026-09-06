#!/usr/bin/env bun
/**
 * Hook `PreModelSwitch`: pone la cifra del catálogo en el diálogo del cliente.
 *
 * El ejecutable 2.1.258 entrega en el payload `from_model`, `to_model`,
 * `context_tokens` (lo que la petición siguiente reenvía), `prompt_cache_warm`,
 * `cache_ttl` y su propia `estimated_cache_write_usd` (precio de lista o el
 * `modelPricing` gestionado, según `pricing`). Con `permissionDecision: "ask"`
 * el diálogo sustituye su subtítulo por la razón que devolvamos: «A
 * PreModelSwitch hook asked you to confirm» + nuestra razón. Nunca deniega:
 * cambiar de modelo es decisión del ejecutor; el hook sólo la pone en USD y
 * la contrasta con lo que cuesta seguir leyendo cacheado.
 *
 * Sale `{}` (sin opinión) cuando la caché ya no está viva — no hay nada que
 * perder — o cuando el payload no es el de este evento. Con `source: "sdk"`
 * (Remote Control, IDE, SDK) responde `allow`: esa sesión no puede preguntar
 * y un `ask` allí bloquea el cambio — ver `CANNOT_ASK`.
 */
import { routesForOtherModel } from '../cost/cacheRoutes.ts'
import { MODELS } from '../models.ts'

type Payload = {
  hook_event_name?: string
  from_model?: string
  to_model?: string
  context_tokens?: number
  prompt_cache_warm?: boolean
  cache_ttl?: '5m' | '1h'
  estimated_cache_write_usd?: number
  pricing?: 'configured' | 'catalog' | 'default'
  /** Quién pidió el cambio; el ejecutable 2.1.258 declara los cinco valores. */
  source?: 'command' | 'picker' | 'sdk' | 'auto' | 'resume'
}

/**
 * Un `ask` sólo tiene sentido donde hay diálogo. En una sesión Remote
 * Control/SDK el cambio llega como `set_model` (`source: "sdk"`) y el cliente
 * lo bloquea con «Model switch blocked by a PreModelSwitch hook: confirmation
 * required, and this session cannot ask» (2.1.258). Medido en la sesión
 * 168b0fdf el 2026-09-02: el cambio a claude-opus-5 quedó `user_switch_pending`
 * y los turnos siguientes los sirvió claude-fable-5-1 (H-DOCS-1012). Ahí el
 * hook permite y deja la cifra como `systemMessage`; el ejecutor ya decidió.
 */
const CANNOT_ASK: ReadonlySet<string> = new Set(['sdk', 'auto', 'resume'])

/**
 * Cuánto pesa un token de escritura de caché frente a uno de lectura, en el
 * tier del modelo. Es adimensional: el mismo número que el múltiplo de coste,
 * sin nombrar moneda — el ejecutor pide la razón en tokens (2026-09-02).
 */
function writeOverRead(modelId: string, ttl: '5m' | '1h'): number | undefined {
  const p = MODELS[modelId]?.pricing
  if (!p || !p.cache_read) return undefined
  return (ttl === '1h' ? p.cache_write_1h : p.cache_write_5m) / p.cache_read
}

/** La vía más barata que conserva la clave del hilo principal, si la hay. */
function keepCacheHint(from: string, to: string, ctx: number, ttl: '5m' | '1h'): string {
  const keep = routesForOtherModel({ from, to, contextTokens: ctx, cacheTtl: ttl, subagentFloorTokens: 126_029 }).filter(
    (r) => r.keepsMainCache && r.kind !== 'switch-and-return',
  )
  const best = keep[0]
  if (!best) return ''
  return ` Sin perder la caché: ${best.kind} en ${to} (${best.detail}).`
}

export function decide(payload: Payload): Record<string, unknown> {
  if (payload.hook_event_name !== 'PreModelSwitch') return {}
  const { from_model: from, to_model: to } = payload
  if (!from || !to || from === to) return {}
  if (!payload.prompt_cache_warm || !(payload.context_tokens && payload.context_tokens > 0)) return {}
  const ctx = payload.context_tokens
  const ttl = payload.cache_ttl ?? '1h'
  const tokens = ctx.toLocaleString('es-MX')
  const peso = writeOverRead(to, ttl)
  let reason: string
  if (!MODELS[from]?.pricing || !MODELS[to]?.pricing || peso === undefined) {
    const faltan = [from, to].filter((m) => !MODELS[m]?.pricing).join(', ') || to
    reason =
      `Cambiar de ${from} a ${to} reescribe ${tokens} tokens de contexto ` +
      `(escritura de caché a ${ttl}), en vez de leerlos cacheados. ` +
      `Fuera del catálogo del paquete: ${faltan}.`
  } else {
    reason =
      `Cambiar de ${from} a ${to} reescribe ${tokens} tokens de contexto como escritura de caché a ${ttl} ` +
      `(y otros ${tokens} si se vuelve fuera del TTL), en vez de leerlos cacheados en ${from}. ` +
      `En el tier de ${to} un token escrito pesa ${peso.toFixed(0)}× uno leído, así que la reescritura ` +
      `equivale a ${Math.round(ctx * peso).toLocaleString('es-MX')} tokens de lectura. ` +
      `La caché no es portable entre modelos —la clave lleva el modelo—, así que lo único que abarata ` +
      `el cambio es reducir el contexto: compactar antes deja al modelo nuevo reescribiendo el resumen ` +
      `en vez de la historia entera.` +
      keepCacheHint(from, to, ctx, ttl)
  }
  const headless = payload.source !== undefined && CANNOT_ASK.has(payload.source)
  return {
    hookSpecificOutput: {
      hookEventName: 'PreModelSwitch',
      permissionDecision: headless ? 'allow' : 'ask',
      permissionDecisionReason: reason,
    },
    ...(headless ? { systemMessage: reason } : {}),
  }
}

if (import.meta.main) {
  let payload: Payload = {}
  try {
    const raw = await Bun.stdin.text()
    payload = raw.trim() ? (JSON.parse(raw) as Payload) : {}
  } catch {
    payload = {}
  }
  process.stdout.write(`${JSON.stringify(decide(payload))}\n`)
}
