/**
 * Porte COMPLETO de `ccnmt: packages/storage/src/parseGitRemote.ts`.
 *
 * Módulo hoja sin dependencias externas — se porta entero, con su
 * comentario de origen conservado: fue extraído de detectRepository.ts
 * en la fuente para romper el ciclo storage/git ↔ storage/detectRepository
 * (git usa parseGitRemote en getGithubRepo vía import dinámico;
 * detectRepository importa getRemoteUrl de git de forma estática).
 */

export type ParsedRepository = {
  host: string
  owner: string
  name: string
}

/**
 * Parsea una URL de remoto git en sus componentes host, owner y name.
 * Soporta: SSH (git@host:owner/repo.git), URL (https/ssh/git://host/owner/repo[.git]).
 */
export function parseGitRemote(input: string): ParsedRepository | null {
  const trimmed = input.trim()

  // Formato SSH: git@host:owner/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (sshMatch?.[1] && sshMatch[2] && sshMatch[3]) {
    if (!looksLikeRealHostname(sshMatch[1])) return null
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      name: sshMatch[3],
    }
  }

  // Formato URL: https://host/owner/repo.git, ssh://git@host/owner/repo, git://host/owner/repo
  const urlMatch = trimmed.match(
    /^(https?|ssh|git):\/\/(?:[^@]+@)?([^/:]+(?::\d+)?)\/([^/]+)\/([^/]+?)(?:\.git)?$/,
  )
  if (urlMatch?.[1] && urlMatch[2] && urlMatch[3] && urlMatch[4]) {
    const protocol = urlMatch[1]
    const hostWithPort = urlMatch[2]
    const hostWithoutPort = hostWithPort.split(':')[0] ?? ''
    if (!looksLikeRealHostname(hostWithoutPort)) return null
    const host =
      protocol === 'https' || protocol === 'http'
        ? hostWithPort
        : hostWithoutPort
    return {
      host,
      owner: urlMatch[3],
      name: urlMatch[4],
    }
  }

  return null
}

/**
 * Los TLDs reales son puramente alfabéticos; los alias SSH como
 * "github.com-work" tienen un último segmento "com-work" que contiene un
 * guion.
 */
function looksLikeRealHostname(host: string): boolean {
  if (!host.includes('.')) return false
  const lastSegment = host.split('.').pop()
  if (!lastSegment) return false
  return /^[a-zA-Z]+$/.test(lastSegment)
}
