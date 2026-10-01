/**
 * La compuerta de las operaciones privilegiadas del MITM: si hace falta pedir
 * la contraseña de sudo antes de elevar. La decide la plataforma del servidor,
 * no la del navegador: en Windows eleva UAC, siendo root no hay a quién
 * pedirla, y con NOPASSWD o sin `sudo` instalado tampoco.
 *
 * Porte de `omniroute: src/mitm/sudoGate.ts` (MIT).
 */
import os from 'node:os'

import { isSudoPasswordRequired } from './dns/dnsConfig.ts'
import { isRoot } from './systemCommands.ts'

/** Recorta la contraseña; una hecha sólo de espacios cuenta como ausente. */
export function normalizeMitmSudoPasswordInput(value?: string | null): string {
  return value?.trim() ?? ''
}

/** La contraseña de la petición y, si no trae, la guardada en el proceso. */
export function resolveMitmSudoPassword(bodyPassword?: string, cachedPassword?: string | null): string {
  const body = normalizeMitmSudoPasswordInput(bodyPassword)
  if (body) return body
  return normalizeMitmSudoPasswordInput(cachedPassword)
}

/** ¿Debe rehusar la operación privilegiada por falta de contraseña? */
export function isMitmSudoPasswordRequired(sudoPassword: string): boolean {
  if (os.platform() === 'win32') return false
  if (isRoot()) return false
  if (normalizeMitmSudoPasswordInput(sudoPassword)) return false
  return isSudoPasswordRequired()
}

/** ¿Pueden correr la confianza del certificado y el DNS? El inverso de la compuerta. */
export function canRunPrivilegedMitmSteps(sudoPassword: string): boolean {
  return !isMitmSudoPasswordRequired(sudoPassword)
}
