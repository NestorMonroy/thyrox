/**
 * Porte verbatim de `ccnmt: packages/storage/src/__tests__/parseGitRemote.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { parseGitRemote } from '../parseGitRemote.js'

describe('parseGitRemote — formato SSH (git@host:owner/repo)', () => {
  test('URL SSH básica con sufijo .git', () => {
    expect(parseGitRemote('git@github.com:owner/repo.git')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('URL SSH sin sufijo .git', () => {
    expect(parseGitRemote('git@github.com:owner/repo')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('GitLab SSH', () => {
    expect(parseGitRemote('git@gitlab.com:group/project.git')).toEqual({
      host: 'gitlab.com',
      owner: 'group',
      name: 'project',
    })
  })

  test('Bitbucket SSH', () => {
    expect(parseGitRemote('git@bitbucket.org:team/repo.git')).toEqual({
      host: 'bitbucket.org',
      owner: 'team',
      name: 'repo',
    })
  })

  test('URL SSH con owner/repo con guiones', () => {
    expect(parseGitRemote('git@github.com:my-org/my-repo.git')).toEqual({
      host: 'github.com',
      owner: 'my-org',
      name: 'my-repo',
    })
  })

  test('rechaza hostnames alias de SSH (p. ej. "github.com-work")', () => {
    // Contrato crítico: alias SSH como "github.com-work" usados en
    // ~/.ssh/config parecen hosts reales pero NO lo son —
    // looksLikeRealHostname exige que el último segmento DNS sea
    // puramente alfabético. "com-work" contiene un guion → se rechaza.
    // Sin esto, el descubrimiento de repos de GitHub enrutaría mal hacia
    // el nombre del alias como si fuera el string del host.
    expect(parseGitRemote('git@github.com-work:owner/repo.git')).toBeNull()
  })

  test('rechaza hostname pelado (sin punto)', () => {
    expect(parseGitRemote('git@localhost:owner/repo.git')).toBeNull()
  })

  test('rechaza TLD solo-dígitos', () => {
    // 192.168.1.1 — el último segmento es "1" (dígitos), que falla el alfa-solo.
    expect(parseGitRemote('git@192.168.1.1:owner/repo.git')).toBeNull()
  })

  test('preserva el espacio final vía trim', () => {
    expect(parseGitRemote('  git@github.com:owner/repo.git  ')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })
})

describe('parseGitRemote — formato HTTPS', () => {
  test('URL HTTPS básica con .git', () => {
    expect(parseGitRemote('https://github.com/owner/repo.git')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('URL HTTPS sin .git', () => {
    expect(parseGitRemote('https://github.com/owner/repo')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('URL HTTP (no solo HTTPS)', () => {
    expect(parseGitRemote('http://gitea.example.com/owner/repo.git')).toEqual({
      host: 'gitea.example.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('HTTPS con credenciales embebidas (user@host)', () => {
    expect(
      parseGitRemote('https://user:pass@github.com/owner/repo.git'),
    ).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('HTTPS con puerto — el puerto se preserva en el host (solo https/http)', () => {
    // Crítico: HTTPS/HTTP conservan el puerto en el string de host (p. ej.
    // "ent.example.com:8443") porque el componente host naturalmente
    // incluye :puerto para el enrutamiento HTTP. SSH/git strippean el
    // puerto (convención distinta).
    expect(parseGitRemote('https://example.com:8443/owner/repo.git')).toEqual({
      host: 'example.com:8443',
      owner: 'owner',
      name: 'repo',
    })
  })
})

describe('parseGitRemote — formato git://', () => {
  test('URL git://', () => {
    expect(parseGitRemote('git://github.com/owner/repo.git')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('git:// elimina el puerto del host (convención distinta vs https)', () => {
    // Para el protocolo git://, el puerto se elimina del host. Documenta
    // esta asimetría frente a https donde el puerto se queda pegado.
    expect(parseGitRemote('git://example.com:9418/owner/repo.git')).toEqual({
      host: 'example.com',
      owner: 'owner',
      name: 'repo',
    })
  })
})

describe('parseGitRemote — formato ssh://', () => {
  test('ssh:// con usuario embebido', () => {
    expect(parseGitRemote('ssh://git@github.com/owner/repo.git')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo',
    })
  })

  test('ssh:// elimina el puerto del host', () => {
    expect(parseGitRemote('ssh://git@example.com:22/owner/repo.git')).toEqual({
      host: 'example.com',
      owner: 'owner',
      name: 'repo',
    })
  })
})

describe('parseGitRemote — entradas inválidas', () => {
  test('cadena vacía devuelve null', () => {
    expect(parseGitRemote('')).toBeNull()
  })

  test('solo espacios en blanco devuelve null', () => {
    expect(parseGitRemote('   ')).toBeNull()
  })

  test('texto plano devuelve null', () => {
    expect(parseGitRemote('not a git url')).toBeNull()
  })

  test('https sin path owner/repo devuelve null', () => {
    expect(parseGitRemote('https://github.com')).toBeNull()
  })

  test('https con solo owner (sin repo) devuelve null', () => {
    expect(parseGitRemote('https://github.com/owner')).toBeNull()
  })

  test('https con demasiados segmentos de path devuelve null', () => {
    // El regex empareja ([^/]+)\/([^/]+) — exactamente dos segmentos
    // después del host. /owner/repo/sub tendría un /sub final que no encaja.
    expect(
      parseGitRemote('https://github.com/owner/repo/extra'),
    ).toBeNull()
  })

  test('SSH con dos puntos extra los absorbe en el campo owner (regex permisivo)', () => {
    // Documenta el comportamiento real: el regex `[^/]+` permite dos
    // puntos dentro del segmento owner.
    // `git@github.com:owner:extra/repo.git` empareja con
    // owner='owner:extra'. Un endurecimiento futuro podría rechazar esto,
    // pero el contrato actual es permisivo.
    expect(parseGitRemote('git@github.com:owner:extra/repo.git')).toEqual({
      host: 'github.com',
      owner: 'owner:extra',
      name: 'repo',
    })
  })

  test('protocolo no reconocido devuelve null', () => {
    expect(
      parseGitRemote('ftp://github.com/owner/repo.git'),
    ).toBeNull()
  })

  test('basura con @ no empareja con la forma SSH', () => {
    expect(parseGitRemote('xxx@yyy.zzz')).toBeNull()
  })
})

describe('parseGitRemote — manejo del sufijo del nombre del repo', () => {
  test('elimina SOLO el .git final, no un .git interno', () => {
    // Los nombres de repo con puntos/.git internos necesitan un manejo
    // cuidadoso del regex. El +?(?:\.git)? no-codicioso captura la
    // porción más larga que no sea .git.
    expect(parseGitRemote('git@github.com:owner/my.repo.git')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'my.repo',
    })
  })

  test('nombre de repo sin extensión', () => {
    expect(parseGitRemote('git@github.com:owner/repo-name')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'repo-name',
    })
  })

  test('nombre de repo con puntos (sin sufijo .git)', () => {
    expect(parseGitRemote('git@github.com:owner/my.dotted.repo')).toEqual({
      host: 'github.com',
      owner: 'owner',
      name: 'my.dotted.repo',
    })
  })
})
