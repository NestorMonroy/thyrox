/**
 * Tests para normalizeGitRemoteUrl — se usa como entrada de SHA256 que
 * identifica un repo a través de variantes de clon SSH/HTTPS y a través
 * del proxy CCR (donde el host viene codificado en el path).
 *
 * Un error aquí hace que dos checkouts del mismo repo hasheen distinto
 * (un usuario ve listas de sesión duplicadas) o — peor — que dos repos
 * no relacionados colisionen (fuga de privacidad).
 *
 * Porte verbatim de `ccnmt: packages/storage/src/__tests__/normalizeGitRemoteUrl.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { normalizeGitRemoteUrl } from '../git.js'

describe('normalizeGitRemoteUrl — formato SSH (git@host:owner/repo)', () => {
  test('URL SSH básica con sufijo .git', () => {
    expect(normalizeGitRemoteUrl('git@github.com:owner/repo.git')).toBe(
      'github.com/owner/repo',
    )
  })

  test('URL SSH sin sufijo .git', () => {
    expect(normalizeGitRemoteUrl('git@github.com:owner/repo')).toBe(
      'github.com/owner/repo',
    )
  })

  test('SSH con path profundo (/group/subgroup/repo)', () => {
    expect(normalizeGitRemoteUrl('git@gitlab.com:group/subgroup/repo.git'))
      .toBe('gitlab.com/group/subgroup/repo')
  })

  test('SSH pone en minúsculas el host Y el path', () => {
    expect(normalizeGitRemoteUrl('git@GITHUB.COM:OWNER/Repo.git')).toBe(
      'github.com/owner/repo',
    )
  })
})

describe('normalizeGitRemoteUrl — formato de URL HTTPS/SSH', () => {
  test('URL https con .git', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo.git')).toBe(
      'github.com/owner/repo',
    )
  })

  test('URL https sin .git', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo')).toBe(
      'github.com/owner/repo',
    )
  })

  test('URL http (insegura) también se acepta', () => {
    expect(normalizeGitRemoteUrl('http://gitea.example.com/user/proj')).toBe(
      'gitea.example.com/user/proj',
    )
  })

  test('URL https con userinfo (token@host) elimina el userinfo', () => {
    expect(
      normalizeGitRemoteUrl('https://x-access-token:abc@github.com/owner/repo'),
    ).toBe('github.com/owner/repo')
  })

  test('URL ssh:// se acepta', () => {
    expect(normalizeGitRemoteUrl('ssh://git@github.com/owner/repo')).toBe(
      'github.com/owner/repo',
    )
  })

  test('pone todo en minúsculas', () => {
    expect(normalizeGitRemoteUrl('https://GitHub.com/Owner/Repo.git')).toBe(
      'github.com/owner/repo',
    )
  })
})

describe('normalizeGitRemoteUrl — URLs del proxy CCR', () => {
  test('formato legado del proxy (sin host en el path) → asume github.com', () => {
    // http://...@127.0.0.1:PORT/git/owner/repo
    expect(
      normalizeGitRemoteUrl(
        'http://local_proxy@127.0.0.1:16583/git/owner/repo',
      ),
    ).toBe('github.com/owner/repo')
  })

  test('formato GHE del proxy (host codificado en el path) → usa el host codificado', () => {
    // El primer segmento del path con un punto se trata como hostname.
    expect(
      normalizeGitRemoteUrl(
        'http://proxy@127.0.0.1:9999/git/ghe.host.com/owner/repo',
      ),
    ).toBe('ghe.host.com/owner/repo')
  })

  test('proxy en localhost (no 127.0.0.1) también elimina el prefijo /git/', () => {
    expect(
      normalizeGitRemoteUrl('http://localhost:16583/git/owner/repo'),
    ).toBe('github.com/owner/repo')
  })

  test('proxy con sufijo .git en el nombre del repo', () => {
    expect(
      normalizeGitRemoteUrl('http://127.0.0.1:8080/git/owner/repo.git'),
    ).toBe('github.com/owner/repo')
  })

  test('URL 127.0.0.1 sin ser proxy (sin prefijo /git/) → se conserva tal cual', () => {
    // Sin /git/, esto no es una URL de proxy — se trata el host normalmente.
    expect(normalizeGitRemoteUrl('http://127.0.0.1:8080/owner/repo')).toBe(
      '127.0.0.1:8080/owner/repo',
    )
  })

  test('proxy con path de 2 segmentos tipo GHE → asume github.com (solo owner/repo)', () => {
    // 2 segmentos después de /git/ → formato legado → prefijo github.com.
    expect(
      normalizeGitRemoteUrl('http://127.0.0.1:8080/git/owner/repo'),
    ).toBe('github.com/owner/repo')
  })

  test('proxy con primer-segmento-sin-punto (3 segmentos) → sigue siendo github.com', () => {
    // Documentado: la heurística del punto para "¿esto es un hostname?".
    // Sin punto, el primer segmento se trata como el nombre de la org.
    expect(
      normalizeGitRemoteUrl('http://127.0.0.1:8080/git/group/subgroup/repo'),
    ).toBe('github.com/group/subgroup/repo')
  })
})

describe('normalizeGitRemoteUrl — entradas inválidas / de borde', () => {
  test('cadena vacía → null', () => {
    expect(normalizeGitRemoteUrl('')).toBeNull()
  })

  test('solo espacios en blanco → null', () => {
    expect(normalizeGitRemoteUrl('   \t  \n')).toBeNull()
  })

  test('texto plano (no una URL) → null', () => {
    expect(normalizeGitRemoteUrl('not-a-url')).toBeNull()
  })

  test('URL ftp:// NO se reconoce → null', () => {
    expect(normalizeGitRemoteUrl('ftp://example.com/repo')).toBeNull()
  })

  test('URL git:// NO se reconoce → null', () => {
    // El esquema de protocolo git:// no está en el regex (solo http/https/ssh).
    expect(normalizeGitRemoteUrl('git://github.com/owner/repo')).toBeNull()
  })

  test('forma SSH con owner vacío → null (el regex exige no-vacío)', () => {
    expect(normalizeGitRemoteUrl('git@github.com:')).toBeNull()
  })

  test('espacio inicial/final se recorta con trim', () => {
    expect(
      normalizeGitRemoteUrl('  https://github.com/owner/repo.git  '),
    ).toBe('github.com/owner/repo')
  })
})

describe('normalizeGitRemoteUrl — invariante de sensibilidad a mayúsculas', () => {
  test('las formas SSH y HTTPS del mismo repo normalizan igual', () => {
    expect(normalizeGitRemoteUrl('git@github.com:Owner/Repo.git')).toBe(
      normalizeGitRemoteUrl('https://github.com/Owner/Repo.git'),
    )
  })

  test('las formas proxy y directa del mismo repo normalizan igual', () => {
    expect(
      normalizeGitRemoteUrl('http://proxy@127.0.0.1:8080/git/owner/repo'),
    ).toBe(normalizeGitRemoteUrl('https://github.com/owner/repo.git'))
  })
})

describe('normalizeGitRemoteUrl — literales de host IPv6', () => {
  test('IPv6 ssh://[::1]:22/owner/repo → [::1]/owner/repo', () => {
    expect(normalizeGitRemoteUrl('ssh://git@[::1]:22/owner/repo')).toBe(
      '[::1]/owner/repo',
    )
  })

  test('host IPv6 enrutable con puerto → el puerto se elimina', () => {
    expect(
      normalizeGitRemoteUrl('http://[2001:db8::1]:8443/owner/repo'),
    ).toBe('[2001:db8::1]/owner/repo')
  })

  test('IPv6 con y sin puerto son equivalentes (mismo hash)', () => {
    expect(
      normalizeGitRemoteUrl('http://[2001:db8::1]:8443/owner/repo'),
    ).toBe(normalizeGitRemoteUrl('http://[2001:db8::1]/owner/repo'))
  })

  test('los corchetes de IPv6 se preservan en la salida normalizada', () => {
    // Sin un split consciente de corchetes, host.split(':')[0] eliminaría
    // el corchete de cierre y produciría "[" como host. El fix usa ']:'
    // como separador.
    const r = normalizeGitRemoteUrl('http://[2001:db8::1]/owner/repo')
    expect(r).toMatch(/^\[2001:db8::1\]\//)
  })
})

describe('normalizeGitRemoteUrl — eliminación de sufijos de URL', () => {
  test('se elimina la barra final', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo/')).toBe(
      'github.com/owner/repo',
    )
  })

  test('se eliminan múltiples barras finales', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo///')).toBe(
      'github.com/owner/repo',
    )
  })

  test('se elimina el sufijo ?query', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo?ref=main'))
      .toBe('github.com/owner/repo')
  })

  test('se elimina el sufijo #hash', () => {
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo#branch'))
      .toBe('github.com/owner/repo')
  })

  test('la combinación de sufijos se elimina por completo', () => {
    expect(
      normalizeGitRemoteUrl('https://github.com/owner/repo.git/?ref=main#x'),
    ).toBe('github.com/owner/repo')
  })

  test('todas las formas de sufijo hashean igual que la canónica', () => {
    const canonical = 'github.com/owner/repo'
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo')).toBe(canonical)
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo/')).toBe(canonical)
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo?x=y')).toBe(canonical)
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo#x')).toBe(canonical)
    expect(normalizeGitRemoteUrl('https://github.com/owner/repo.git/')).toBe(canonical)
  })
})

describe('normalizeGitRemoteUrl — eliminación de puerto (regresión)', () => {
  test('el puerto explícito en host no-localhost se elimina (SSH 22)', () => {
    // Bug real: git@github.com:owner/repo y
    // ssh://git@github.com:22/owner/repo son el mismo destino de clon.
    // DEBEN hashear igual, si no el mismo checkout aparece dos veces en
    // las listas de --resume.
    expect(normalizeGitRemoteUrl('ssh://git@github.com:22/owner/repo.git'))
      .toBe('github.com/owner/repo')
  })

  test('el puerto HTTPS explícito (443) se elimina', () => {
    expect(normalizeGitRemoteUrl('https://github.com:443/owner/repo.git'))
      .toBe('github.com/owner/repo')
  })

  test('un puerto no estándar en host no-localhost también se elimina', () => {
    // La función elimina el sufijo ":puerto" completo, sin importar el
    // valor. Esto es correcto: la identidad del repo es host+path, no el
    // puerto de conexión que el usuario esté usando.
    expect(normalizeGitRemoteUrl('ssh://git@github.com:2222/owner/repo'))
      .toBe('github.com/owner/repo')
  })

  test('las 4 formas (SCP, ssh:// sin puerto, ssh:// :22, https :443) coinciden', () => {
    const expected = 'github.com/owner/repo'
    expect(normalizeGitRemoteUrl('git@github.com:owner/repo.git')).toBe(expected)
    expect(normalizeGitRemoteUrl('ssh://git@github.com/owner/repo.git')).toBe(expected)
    expect(normalizeGitRemoteUrl('ssh://git@github.com:22/owner/repo.git')).toBe(expected)
    expect(normalizeGitRemoteUrl('https://github.com:443/owner/repo.git')).toBe(expected)
  })

  test('los puertos en localhost SE CONSERVAN (el proxy CCR usa el puerto para distinguir demonios)', () => {
    // Documentado: los puertos de localhost SÍ son distintivos — puertos
    // distintos son demonios de proxy distintos, posiblemente sirviendo
    // repos distintos.
    expect(normalizeGitRemoteUrl('http://127.0.0.1:8080/owner/repo')).toBe(
      '127.0.0.1:8080/owner/repo',
    )
    expect(normalizeGitRemoteUrl('http://127.0.0.1:9999/owner/repo')).toBe(
      '127.0.0.1:9999/owner/repo',
    )
  })
})
