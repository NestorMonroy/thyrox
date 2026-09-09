/**
 * Adaptado de `ccnmt: packages/swarm/src/worktree/__tests__/parsers.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { parsePRReference, validateWorktreeSlug } from '../index.js'

describe('parsePRReference — URL estilo GitHub', () => {
  test('URL básica de github.com', () => {
    expect(parsePRReference('https://github.com/owner/repo/pull/123')).toBe(123)
  })

  test('http (no https) aceptado', () => {
    expect(parsePRReference('http://github.com/owner/repo/pull/1')).toBe(1)
  })

  test('URL GHE aceptada (cualquier host empareja)', () => {
    expect(parsePRReference('https://ghe.example.com/owner/repo/pull/42')).toBe(42)
  })

  test('slash final aceptado', () => {
    expect(parsePRReference('https://github.com/owner/repo/pull/123/')).toBe(123)
  })

  test('query string después de la URL aceptada', () => {
    expect(parsePRReference('https://github.com/owner/repo/pull/123?diff=split')).toBe(123)
  })

  test('fragment después de la URL aceptado', () => {
    expect(parsePRReference('https://github.com/owner/repo/pull/123#issue-123')).toBe(123)
  })

  test('emparejamiento sin distinción de mayúsculas', () => {
    // El flag /i está fijado en la regex.
    expect(parsePRReference('HTTPS://GITHUB.COM/owner/repo/PULL/5')).toBe(5)
  })

  test('número de PR multi-dígito', () => {
    expect(parsePRReference('https://github.com/owner/repo/pull/99999')).toBe(99999)
  })

  test('owner/repo con guiones aceptado', () => {
    expect(parsePRReference('https://github.com/my-org/my-repo/pull/1')).toBe(1)
  })

  test('owner/repo con puntos aceptado', () => {
    // La regex es `[^/]+/[^/]+` — cualquier cosa excepto slash.
    expect(parsePRReference('https://github.com/foo.bar/baz.qux/pull/1')).toBe(1)
  })
})

describe('parsePRReference — formato #N', () => {
  test('#123 aceptado', () => {
    expect(parsePRReference('#123')).toBe(123)
  })

  test('#1 aceptado', () => {
    expect(parsePRReference('#1')).toBe(1)
  })

  test('#N multi-dígito', () => {
    expect(parsePRReference('#99999')).toBe(99999)
  })
})

describe('parsePRReference — casos de rechazo', () => {
  test('número plano (sin #) → null', () => {
    // Ancla: debe tener prefijo '#' o forma completa de URL.
    expect(parsePRReference('123')).toBeNull()
  })

  test('# sin número → null', () => {
    expect(parsePRReference('#')).toBeNull()
  })

  test('# con no-dígito → null', () => {
    expect(parsePRReference('#abc')).toBeNull()
  })

  test('# con signo + inicial → null (deben ser dígitos planos)', () => {
    expect(parsePRReference('#+123')).toBeNull()
  })

  test('URL de merge request de GitLab → null (forma de ruta distinta)', () => {
    // GitLab usa /-/merge_requests/N. La regex requiere /pull/N.
    expect(parsePRReference('https://gitlab.com/owner/repo/-/merge_requests/1')).toBeNull()
  })

  test('URL de pull-request de Bitbucket → null', () => {
    expect(parsePRReference('https://bitbucket.org/owner/repo/pull-requests/1')).toBeNull()
  })

  test('URL con segmentos de ruta extra después del número de PR → null', () => {
    // La regex está anclada al final (con ? o # opcional). Rutas extra fallan.
    expect(parsePRReference('https://github.com/owner/repo/pull/123/files')).toBeNull()
  })

  test('ruta relativa (no URL completa) → null', () => {
    expect(parsePRReference('/owner/repo/pull/123')).toBeNull()
  })

  test('texto que contiene una URL de PR → null (anclado al inicio)', () => {
    expect(
      parsePRReference('Check this: https://github.com/owner/repo/pull/123'),
    ).toBeNull()
  })

  test('texto plano → null', () => {
    expect(parsePRReference('feature-branch')).toBeNull()
  })

  test('string vacío → null', () => {
    expect(parsePRReference('')).toBeNull()
  })

  test('protocolo distinto de http/https → null', () => {
    expect(parsePRReference('ftp://github.com/owner/repo/pull/1')).toBeNull()
  })
})

describe('validateWorktreeSlug — frontera de seguridad', () => {
  // CRÍTICO: el slug se une en `.claude/worktrees/<slug>` vía path.join.
  // Sin la validación, '../../../etc/passwd' escaparía el directorio de
  // worktrees, Y una ruta absoluta descartaría el prefijo. Este validador
  // corre síncronamente antes de CUALQUIER efecto secundario (git, hooks).

  test('slug alfanumérico simple aceptado', () => {
    expect(() => validateWorktreeSlug('feature-foo')).not.toThrow()
  })

  test('guion bajo + guion + punto permitidos', () => {
    expect(() => validateWorktreeSlug('foo_bar.baz-1')).not.toThrow()
  })

  test('sólo dígitos permitido', () => {
    expect(() => validateWorktreeSlug('123')).not.toThrow()
  })

  test('anidamiento con forward-slash permitido (validación por segmento)', () => {
    expect(() => validateWorktreeSlug('user/feature-foo')).not.toThrow()
  })

  test('anidamiento multi-nivel permitido', () => {
    expect(() => validateWorktreeSlug('team/user/feature')).not.toThrow()
  })

  // ─── Intentos de path-traversal ──────────────────────────────────────

  test('RECHAZA segmento literal "."', () => {
    expect(() => validateWorktreeSlug('.')).toThrow(
      /must not contain "\." or "\.\." path segments/,
    )
  })

  test('RECHAZA segmento literal ".."', () => {
    expect(() => validateWorktreeSlug('..')).toThrow(
      /must not contain "\." or "\.\." path segments/,
    )
  })

  test('RECHAZA traversal "../target"', () => {
    expect(() => validateWorktreeSlug('../target')).toThrow()
  })

  test('RECHAZA traversal ".." anidado profundo', () => {
    expect(() => validateWorktreeSlug('a/../../etc')).toThrow()
  })

  test('RECHAZA "." en medio de la ruta', () => {
    expect(() => validateWorktreeSlug('a/./b')).toThrow()
  })

  // ─── Intentos de ruta absoluta ───────────────────────────────────────

  test('RECHAZA slash inicial (produciría ruta absoluta)', () => {
    // path.join('/.claude/worktrees', '/etc') → '/etc'.
    expect(() => validateWorktreeSlug('/etc/passwd')).toThrow(
      /each "\/"-separated segment must be non-empty/,
    )
  })

  test('RECHAZA especificador de unidad Windows (C:)', () => {
    // Los dos puntos no están en la lista blanca. C:foo → segmento C:foo
    // → falla la regex.
    expect(() => validateWorktreeSlug('C:foo')).toThrow(/each "\/"-separated segment/)
  })

  test('RECHAZA separador de ruta backslash', () => {
    // \ no está en la lista blanca; el segmento 'C\\Users' falla la regex.
    expect(() => validateWorktreeSlug('C\\Users\\foo')).toThrow(/each "\/"-separated segment/)
  })

  // ─── Límite de longitud ───────────────────────────────────────────────

  test('RECHAZA slug más largo que MAX_WORKTREE_SLUG_LENGTH (64)', () => {
    const long = 'a'.repeat(65)
    expect(() => validateWorktreeSlug(long)).toThrow(/must be 64 characters or fewer/)
  })

  test('exactamente 64 caracteres aceptado (frontera)', () => {
    const exactly64 = 'a'.repeat(64)
    expect(() => validateWorktreeSlug(exactly64)).not.toThrow()
  })

  test('exactamente 65 caracteres rechazado', () => {
    const exactly65 = 'a'.repeat(65)
    expect(() => validateWorktreeSlug(exactly65)).toThrow()
  })

  // ─── Intentos de caracteres especiales ────────────────────────────────

  test('RECHAZA metacaracter de shell $', () => {
    expect(() => validateWorktreeSlug('$(rm)')).toThrow()
  })

  test('RECHAZA espacios', () => {
    expect(() => validateWorktreeSlug('foo bar')).toThrow()
  })

  test('RECHAZA carácter @', () => {
    expect(() => validateWorktreeSlug('foo@bar')).toThrow()
  })

  test('RECHAZA unicode (sólo ASCII permitido)', () => {
    expect(() => validateWorktreeSlug('feature中文')).toThrow()
  })

  test('RECHAZA byte nulo', () => {
    expect(() => validateWorktreeSlug('foo\0bar')).toThrow()
  })

  // ─── Segmentos vacíos ───────────────────────────────────────────────

  test('RECHAZA string vacío (split produce un único segmento vacío)', () => {
    expect(() => validateWorktreeSlug('')).toThrow(
      /each "\/"-separated segment must be non-empty/,
    )
  })

  test('RECHAZA slash inicial → primer segmento vacío', () => {
    expect(() => validateWorktreeSlug('/foo')).toThrow()
  })

  test('RECHAZA slash final → último segmento vacío', () => {
    expect(() => validateWorktreeSlug('foo/')).toThrow()
  })

  test('RECHAZA doble-slash → segmento medio vacío', () => {
    expect(() => validateWorktreeSlug('foo//bar')).toThrow()
  })

  // ─── Frontera: cada segmento valida independientemente ────────────────

  test('segmentos válido + inválido — falla en el inválido', () => {
    // 'good/$bad' tiene primer segmento bueno pero $ en el segundo.
    expect(() => validateWorktreeSlug('good/$bad')).toThrow()
  })

  test('todos los segmentos en el límite de longitud — total bajo el tope', () => {
    // Frontera: lo que importa es la longitud total, no por segmento.
    const slug = `${'a'.repeat(31)}/${'b'.repeat(31)}` // 63 caracteres.
    expect(() => validateWorktreeSlug(slug)).not.toThrow()
  })
})
