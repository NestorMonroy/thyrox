/**
 * Cambio de modelo con sus dos hooks (T-016, T-029).
 *
 * Cambiar de modelo **no rompe la caché del modelo anterior** —su entrada vive
 * hasta su TTL— pero manda la petición siguiente a otra clave, así que el
 * contexto entero se vuelve a escribir. Medido: un cambio aplicado diez minutos
 * después de compactar reescribió 475 287 tokens (:ref:`h-docs-1012`).
 *
 * De ahí la forma de esta función: **calcula el coste antes de aplicar** y se
 * lo entrega a `PreModelSwitch`, que puede vetar. El hook del propio repo
 * (`@kaupamex/agent`, `bin/preModelSwitch.ts`) es exactamente eso — un
 * consumidor de esta carga, y por eso los nombres de campo son los suyos.
 */
import { runHooks, type HookConfig } from '../hooks.ts'
import { planResume } from './index.ts'

export type SwitchOptions = {
  transcriptPath: string
  sessionId: string
  cwd: string
  toModel: string
  hooks?: HookConfig
  /** TTL declarado de la caché; viaja al hook porque decide el precio de reescribirla. */
  cacheTtl?: '5m' | '1h'
}

export type SwitchResult = {
  applied: boolean
  fromModel: string | null
  toModel: string
  rewriteTokens: number
  reason: string
}

export async function switchModel(opts: SwitchOptions): Promise<SwitchResult> {
  const plan = planResume({ transcriptPath: opts.transcriptPath, toModel: opts.toModel })
  if (plan.fromModel === opts.toModel) {
    return {
      applied: false, fromModel: plan.fromModel, toModel: opts.toModel, rewriteTokens: 0,
      reason: 'ya se está en ese modelo: no hay cambio que anunciar',
    }
  }
  const carga = {
    session_id: opts.sessionId,
    transcript_path: opts.transcriptPath,
    cwd: opts.cwd,
    from_model: plan.fromModel,
    to_model: opts.toModel,
    context_tokens: plan.rewriteTokens,
    // Hay caché que perder sólo si hubo un modelo antes. Sin turnos previos no
    // hay entrada que abandonar, y decir lo contrario haría que el hook
    // cobrara una reescritura que nadie va a pagar.
    prompt_cache_warm: plan.fromModel !== null,
    cache_ttl: opts.cacheTtl ?? '1h',
  }
  const pre = await runHooks(opts.hooks ?? {}, 'PreModelSwitch', carga)
  if (pre.blocked) {
    return {
      applied: false, fromModel: plan.fromModel, toModel: opts.toModel, rewriteTokens: plan.rewriteTokens,
      reason: pre.reason ?? 'un hook PreModelSwitch vetó el cambio',
    }
  }
  await runHooks(opts.hooks ?? {}, 'PostModelSwitch', carga)
  return {
    applied: true, fromModel: plan.fromModel, toModel: opts.toModel,
    rewriteTokens: plan.rewriteTokens, reason: plan.reason,
  }
}
