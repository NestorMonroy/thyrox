/**
 * La contraseña de sudo de una petición: la dada o la guardada, si hace
 * falta pedirla, y cómo recordar la dada tras un éxito.
 */
import { z } from 'zod'

import { getCachedPassword, setCachedPassword } from '../../manager.ts'
import { isMitmSudoPasswordRequired, normalizeMitmSudoPasswordInput, resolveMitmSudoPassword } from '../../sudoGate.ts'
import { errorResponse } from '../http.ts'

export interface SudoAccess {
  cached(): string | null
  remember(password: string): void
  /** ¿Rehúsa la operación con esta contraseña ya resuelta? */
  required(password: string): boolean
}

export const realSudoAccess: SudoAccess = {
  cached: getCachedPassword,
  remember: setCachedPassword,
  required: isMitmSudoPasswordRequired,
}

export const SudoBodySchema = z.object({ sudoPassword: z.string().optional() })

export interface SudoRequest {
  password: string
  missing: boolean
  rememberGiven(): void
}

export function sudoRequest(sudo: SudoAccess, platform: NodeJS.Platform, supplied: string | undefined): SudoRequest {
  const password = resolveMitmSudoPassword(supplied, sudo.cached())
  const given = normalizeMitmSudoPasswordInput(supplied)
  return {
    password,
    missing: sudo.required(password),
    rememberGiven: () => {
      // Windows eleva por UAC: allí no hay contraseña que recordar.
      if (platform !== 'win32' && given) sudo.remember(given)
    },
  }
}

export function missingPasswordResponse(): Response {
  return errorResponse({ status: 400, message: 'Missing sudoPassword' })
}
