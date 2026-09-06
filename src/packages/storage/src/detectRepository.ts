/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/storage/src/detectRepository.ts`.
 *
 * La fuente exporta seis símbolos: `clearRepositoryCaches`,
 * `detectCurrentRepository`, `detectCurrentRepositoryWithHost`,
 * `getCachedRepository`, `parseGitHubRepository` (más el re-export de
 * `parseGitRemote`/`ParsedRepository`). Este archivo porta solo el que su
 * test ejercita:
 *
 *   - `parseGitHubRepository` — portada COMPLETA en lógica (los dos
 *     caminos: URL vía `parseGitRemote`, y "owner/repo" pelado vía split
 *     directo). Su única dependencia externa real es `parseGitRemote`, ya
 *     portado en este mismo árbol (`./parseGitRemote.ts`, commit 96136e6).
 *
 * Quedan SIN portar, por divergencia de alcance declarada:
 *
 *   - `detectCurrentRepository`, `detectCurrentRepositoryWithHost`,
 *     `getCachedRepository`, `clearRepositoryCaches` y el cache module-level
 *     `repositoryWithHostCache` — dependen de `getCwd`
 *     (`@claude-code-how-works/app-host/bootstrap/cwd.js`; **prohibido tocar
 *     `app-host/**` en este pase — otro agente lo trabaja en paralelo**) y de
 *     `getRemoteUrl` (`./git.js`; no portado aquí — este agente solo portó
 *     `normalizeGitRemoteUrl`/`isLocalHost` de `git.ts`, commit 6557ef7).
 *
 * Sustituto declarado:
 *
 *   - `logForDebugging` (`@claude-code-how-works/local-observability/debug.js`)
 *     — el paquete `local-observability` no existe en `thyrox`. La única
 *     llamada que le corresponde a `parseGitHubRepository` es de
 *     diagnóstico puro en la rama de fallo final (no afecta el valor de
 *     retorno); se sustituye por un no-op local, igual que el precedente
 *     de `command-runtime/src/promptShellExecution.ts`.
 */

import { parseGitRemote, type ParsedRepository } from './parseGitRemote.js'

export { parseGitRemote, type ParsedRepository }

function logForDebugging(_message: string): void {
  // No-op: no hay canal de depuración centralizado en este árbol todavía.
}

/**
 * Parsea una URL de remoto git o un string "owner/repo" y devuelve
 * "owner/repo". Solo devuelve resultados para hosts github.com — las
 * URLs GHE devuelven null. Usar parseGitRemote() para soporte GHE.
 * También acepta strings "owner/repo" planos por retrocompatibilidad.
 */
export function parseGitHubRepository(input: string): string | null {
  const trimmed = input.trim()

  // Intenta parsear primero como una URL de remoto completa.
  // Solo devuelve resultados para hosts github.com — los consumidores
  // existentes (extensión de VS Code, bridge) asumen que esta función es
  // específica de GitHub.com. Usar parseGitRemote() directamente para
  // soporte GHE.
  const parsed = parseGitRemote(trimmed)
  if (parsed) {
    if (parsed.host !== 'github.com') return null
    return `${parsed.owner}/${parsed.name}`
  }

  // Si no emparejó ningún patrón de URL, revisa si ya está en formato owner/repo
  if (
    !trimmed.includes('://') &&
    !trimmed.includes('@') &&
    trimmed.includes('/')
  ) {
    const parts = trimmed.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      // Elimina la extensión .git si está presente
      const repo = parts[1].replace(/\.git$/, '')
      return `${parts[0]}/${repo}`
    }
  }

  logForDebugging(`Could not parse repository from: ${trimmed}`)
  return null
}

// looksLikeRealHostname se movió a ./parseGitRemote.ts (helper privado).
