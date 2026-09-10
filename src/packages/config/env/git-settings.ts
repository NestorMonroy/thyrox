/**
 * Puerto de `ccnmt: packages/config/env/git-settings.ts` (17 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * `isEnvDefinedFalsy` y `getInitialSettings` se completan/consumen en este
 * mismo pase — ver el docstring de `env/utils.ts`.
 */
import { getInitialSettings } from '../settings/settings.ts'
import { isEnvDefinedFalsy, isEnvTruthy } from './utils.ts'

export function shouldIncludeGitInstructions(): boolean {
  const envVal = process.env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS
  if (isEnvTruthy(envVal)) return false
  if (isEnvDefinedFalsy(envVal)) return true
  return getInitialSettings().includeGitInstructions ?? true
}
