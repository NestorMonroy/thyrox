import { useMemo } from 'react'
import { isEnvTruthy } from '@thyrox/config/env/utils'

export type ReplEnvFlags = {
  titleDisabled: boolean
  moreRightEnabled: boolean
  disableVirtualScroll: boolean
}

/** Las banderas de entorno del REPL, leídas en el momento de la llamada. */
export function readReplEnvFlags(): ReplEnvFlags {
  return {
    titleDisabled: isEnvTruthy(process.env.THYROX_CODE_DISABLE_TERMINAL_TITLE),
    moreRightEnabled:
      process.env.USER_TYPE === 'ant' && isEnvTruthy(process.env.THYROX_MORERIGHT),
    disableVirtualScroll: isEnvTruthy(process.env.THYROX_CODE_DISABLE_VIRTUAL_SCROLL),
  }
}

/**
 * Stable env-derived flags read once at REPL mount.
 *
 * V7 §3.3 — extracted from REPLView.tsx (iter 21). Each flag was an inline
 * useMemo; consolidating into one hook reduces hook-count noise in the host
 * and makes the env contract explicit. La lectura vive en
 * `readReplEnvFlags` para poder medirla sin montar el REPL.
 */
export function useReplEnvFlags(): ReplEnvFlags {
  return useMemo(readReplEnvFlags, [])
}
