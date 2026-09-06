/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/storage/src/git.ts`.
 *
 * La fuente tiene ~29 símbolos exportados (findCanonicalGitRoot, gitExe,
 * getIsGit, getGitDir, isAtGitRoot, dirIsInGitRepo, getHead, getBranch,
 * getDefaultBranch, getRemoteUrl, normalizeGitRemoteUrl, getRepoRemoteHash,
 * getIsHeadOnRemote, hasUnpushedCommits, getIsClean, getChangedFiles,
 * getFileStatus, getWorktreeCount, stashToCleanState, getGitState,
 * getGithubRepo, findRemoteBase, preserveGitStateForIssue,
 * isCurrentDirectoryBareGitRepo, findGitRoot re-exportado, …). Este archivo
 * porta solo los DOS que sus tests ejercitan:
 *
 *   - `normalizeGitRemoteUrl` — portada VERBATIM (mecanismo puro de
 *     regex/string, sin dependencia externa).
 *   - `isLocalHost` — helper privado del que depende `normalizeGitRemoteUrl`
 *     (la rama del proxy CCR y el criterio de "no elidir puerto en
 *     localhost"); portada VERBATIM.
 *
 * Quedan SIN portar, por divergencia de alcance declarada — todos
 * dependen de `execFileNoThrow` (paquete `shell`, no existe aún en este
 * árbol), de `@claude-code-how-works/config/gitFilesystem.js` /
 * `memoize.js` (paquete `config`, hoy no expone esos módulos), de
 * `@claude-code-how-works/app-host/bootstrap/cwd.js` (prohibido tocar en
 * este pase — otro agente trabaja `app-host` en paralelo) o de
 * `@claude-code-how-works/local-observability/*` (paquete que no existe en
 * `thyrox`):
 *
 *   - `findCanonicalGitRoot`, `gitExe`, `getIsGit`, `getGitDir`,
 *     `isAtGitRoot`, `dirIsInGitRepo`, `getHead`, `getBranch`,
 *     `getDefaultBranch`, `getRemoteUrl`, `getRepoRemoteHash`,
 *     `getIsHeadOnRemote`, `hasUnpushedCommits`, `getIsClean`,
 *     `getChangedFiles`, `getFileStatus`, `getWorktreeCount`,
 *     `stashToCleanState`, `getGitState`, `getGithubRepo`,
 *     `findRemoteBase`, `preserveGitStateForIssue`,
 *     `isCurrentDirectoryBareGitRepo`, el re-export de `findGitRoot`.
 *
 * Ninguno de esos símbolos lo ejercita `normalizeGitRemoteUrl.test.ts` ni
 * `normalizeGitRemoteUrl.behavior.test.ts` — son las únicas dos suites
 * asignadas a este agente sobre este archivo.
 */

/**
 * Normaliza una URL de remoto git a una forma canónica para hashear.
 * Convierte URLs SSH y HTTPS al mismo formato: host/owner/repo
 * (minúsculas, sin .git)
 *
 * Ejemplos:
 * - git@github.com:owner/repo.git -> github.com/owner/repo
 * - https://github.com/owner/repo.git -> github.com/owner/repo
 * - ssh://git@github.com/owner/repo -> github.com/owner/repo
 * - http://local_proxy@127.0.0.1:16583/git/owner/repo -> github.com/owner/repo
 */
export function normalizeGitRemoteUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // Formato SSH: git@host:owner/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (sshMatch && sshMatch[1] && sshMatch[2]) {
    return `${sshMatch[1]}/${sshMatch[2]}`.toLowerCase()
  }

  // Elimina query/fragment antes de parsear — `?ref=main`, `#branch`, y una
  // `/` final son sufijos de URL que no afectan la identidad del repo.
  const sanitised = trimmed.replace(/[?#].*$/, '').replace(/\/+$/, '')

  // Formato URL HTTPS/SSH: https://host/owner/repo.git o ssh://git@host/owner/repo
  const urlMatch = sanitised.match(
    /^(?:https?|ssh):\/\/(?:[^@]+@)?([^/]+)\/(.+?)(?:\.git)?$/,
  )
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    const host = urlMatch[1]
    const path = urlMatch[2]

    // Las URLs del proxy git de CCR usan el formato:
    //   Legado:  http://...@127.0.0.1:PORT/git/owner/repo       (se asume github.com)
    //   GHE:     http://...@127.0.0.1:PORT/git/ghe.host/owner/repo (host codificado en el path)
    // Elimina el prefijo /git/. Si el primer segmento contiene un punto, es
    // un hostname (los nombres de org de GitHub no pueden contener puntos).
    // Si no, se asume github.com.
    if (isLocalHost(host) && path.startsWith('git/')) {
      const proxyPath = path.slice(4) // elimina el prefijo "git/"
      const segments = proxyPath.split('/')
      // 3+ segmentos donde el primero contiene un punto → host/owner/repo (formato GHE)
      if (segments.length >= 3 && segments[0]!.includes('.')) {
        return proxyPath.toLowerCase()
      }
      // 2 segmentos → owner/repo (formato legado, se asume github.com)
      return `github.com/${proxyPath}`.toLowerCase()
    }

    // Elimina puertos en host no-localhost para que todas las formas de
    // URL del mismo repo hasheen igual. IPv6 `[::1]:port` pone el puerto
    // DESPUÉS de `]` — `host.replace(/(]|^[^[]*?):\d+$/, '$1')` conserva
    // intacta la dirección entre corchetes y solo recorta un `:puerto` final.
    const h = isLocalHost(host)
      ? host
      : host.replace(/(\]|^[^[]*?):\d+$/, '$1')
    return `${h}/${path}`.toLowerCase()
  }

  return null
}

function isLocalHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0] ?? ''
  return (
    hostWithoutPort === 'localhost' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostWithoutPort)
  )
}
