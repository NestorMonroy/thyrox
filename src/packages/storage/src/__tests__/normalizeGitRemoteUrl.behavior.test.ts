import { describe, expect, test } from 'bun:test'

import { normalizeGitRemoteUrl } from '../git.ts'

/**
 * Fija la normalización de URLs de remoto git. Produce la identidad
 * estable del repo que se usa en:
 *   - getRepoRemoteHash (SHA256 → primeros 16 chars para analítica)
 *   - El emparejamiento de sesiones cross-máquina (el mismo repo clonado
 *     vía SSH vs HTTPS)
 *
 * Una normalización equivocada → el mismo repo se trata como distinto,
 * rompiendo:
 *   - El resume de sesión entre las formas de clon SSH/HTTPS
 *   - La configuración por-repo (búsqueda en la jerarquía CLAUDE.md,
 *     indexada por el id del repo)
 *   - La deduplicación de analítica (el mismo repo contado varias veces)
 *
 * Porte verbatim de `ccnmt: packages/storage/src/__tests__/normalizeGitRemoteUrl.behavior.test.ts`.
 */
describe('normalizeGitRemoteUrl (derivación de identidad del repo)', () => {
  test('formato SSH → host/owner/repo (minúsculas)', () => {
    expect(normalizeGitRemoteUrl('git@github.com:Anthropic/claude-code-how-works-how-works.git')).toBe(
      'github.com/anthropic/claude-code-how-works-how-works',
    )
  })

  test('SSH sin sufijo .git', () => {
    expect(normalizeGitRemoteUrl('git@github.com:owner/repo')).toBe(
      'github.com/owner/repo',
    )
  })

  test('HTTPS → host/owner/repo (minúsculas, .git eliminado)', () => {
    expect(normalizeGitRemoteUrl('https://github.com/Anthropic/claude-code-how-works-how-works.git')).toBe(
      'github.com/anthropic/claude-code-how-works-how-works',
    )
  })

  test('HTTPS con credenciales embebidas en la URL → elimina user:pass@', () => {
    expect(normalizeGitRemoteUrl('https://user:token@github.com/owner/repo.git')).toBe(
      'github.com/owner/repo',
    )
  })

  test('forma legada del proxy CCR (se asume github.com)', () => {
    // http://proxy@127.0.0.1:16583/git/owner/repo → github.com/owner/repo
    expect(normalizeGitRemoteUrl('http://localproxy@127.0.0.1:16583/git/owner/repo')).toBe(
      'github.com/owner/repo',
    )
  })

  test('forma GHE del proxy CCR (host codificado en el path)', () => {
    // 3 segmentos con punto en el primero → host/owner/repo (formato GHE)
    expect(
      normalizeGitRemoteUrl('http://proxy@127.0.0.1:16583/git/ghe.example.com/owner/repo'),
    ).toBe('ghe.example.com/owner/repo')
  })

  test('las formas SSH y HTTPS del mismo repo producen salida IDÉNTICA', () => {
    // Crítico para el emparejamiento de sesión cross-máquina.
    const ssh = normalizeGitRemoteUrl('git@github.com:owner/repo.git')
    const https = normalizeGitRemoteUrl('https://github.com/owner/repo.git')
    expect(ssh).toBe(https)
  })

  test('elimina el string de query ?ref=foo (no afecta la identidad del repo)', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo.git?ref=main')).toBe(
      'github.com/owner/repo',
    )
  })

  test('elimina el #fragment', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo.git#branch')).toBe(
      'github.com/owner/repo',
    )
  })

  test('elimina la barra final', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo/')).toBe(
      'github.com/owner/repo',
    )
  })

  test('elimina el puerto en URLs no-localhost (para que el mismo repo por http vs https hashee igual)', () => {
    // Un servidor git a medida en un puerto debe seguir emparejando entre esquemas.
    expect(normalizeGitRemoteUrl('https://git.example.com:8443/owner/repo.git')).toBe(
      'git.example.com/owner/repo',
    )
  })

  test('conserva el puerto en LOCALHOST (varios servidores git locales pueden diferir por puerto)', () => {
    // El proxy local es distinto por-puerto; no confundir.
    expect(normalizeGitRemoteUrl('http://localhost:8080/owner/repo')).toBe(
      'localhost:8080/owner/repo',
    )
  })

  test('insensible a mayúsculas (pone en minúsculas para un hash estable)', () => {
    expect(normalizeGitRemoteUrl('https://GitHub.com/OWNER/REPO.git')).toBe(
      'github.com/owner/repo',
    )
  })

  test('vacío/espacios en blanco → null', () => {
    expect(normalizeGitRemoteUrl('')).toBe(null)
    expect(normalizeGitRemoteUrl('   ')).toBe(null)
  })

  test('formato no reconocido → null (no lanza)', () => {
    // Defensivo: una URL de remoto basura no debe tumbar el camino de resume de sesión.
    expect(normalizeGitRemoteUrl('not-a-url')).toBe(null)
    expect(normalizeGitRemoteUrl('file:///local/repo')).toBe(null)
  })

  test('los hostnames IPv6 se preservan con corchetes al eliminar el puerto', () => {
    // Fija el regex de IPv6 (el caso complicado). Sin él, `[::1]:port`
    // eliminaría la dirección entre corchetes como si fuera un puerto.
    expect(normalizeGitRemoteUrl('https://[2001:db8::1]:8443/owner/repo')).toBe(
      '[2001:db8::1]/owner/repo',
    )
  })
})
