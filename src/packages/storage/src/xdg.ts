/**
 * Utilidades de XDG Base Directory para el instalador nativo de Claude CLI.
 *
 * Implementa la especificación XDG Base Directory para organizar los
 * componentes del instalador nativo en los directorios de sistema
 * apropiados.
 *
 * Adaptación fiel de `ccnmt: packages/storage/src/xdg.ts`. `readEnv` y
 * `getAllEnv` sustituyen a `@claude-code-how-works/config/env/utils`
 * (ver `./internal/pendingCrossPackageDeps.ts`).
 *
 * @see https://specifications.freedesktop.org/basedir-spec/latest/
 */

import { homedir as osHomedir } from 'os'
import { join } from 'path'
import { getAllEnv, readEnv } from './internal/pendingCrossPackageDeps.js'

type EnvLike = Record<string, string | undefined>

type XDGOptions = {
  env?: EnvLike
  homedir?: string
}

function resolveOptions(options?: XDGOptions): { env: EnvLike; home: string } {
  return {
    env: options?.env ?? getAllEnv(),
    home: options?.homedir ?? readEnv('HOME') ?? osHomedir(),
  }
}

/**
 * Obtiene el directorio XDG state home.
 * Por defecto: ~/.local/state
 */
export function getXDGStateHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  return env.XDG_STATE_HOME ?? join(home, '.local', 'state')
}

/**
 * Obtiene el directorio XDG cache home.
 * Por defecto: ~/.cache
 */
export function getXDGCacheHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  return env.XDG_CACHE_HOME ?? join(home, '.cache')
}

/**
 * Obtiene el directorio XDG data home.
 * Por defecto: ~/.local/share
 */
export function getXDGDataHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  return env.XDG_DATA_HOME ?? join(home, '.local', 'share')
}

/**
 * Obtiene el directorio bin del usuario (no es XDG en sentido estricto pero
 * sigue la convención).
 * Por defecto: ~/.local/bin
 */
export function getUserBinDir(options?: XDGOptions): string {
  const { home } = resolveOptions(options)
  return join(home, '.local', 'bin')
}
