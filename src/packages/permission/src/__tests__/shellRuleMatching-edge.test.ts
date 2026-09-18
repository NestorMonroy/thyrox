import { describe, expect, test } from 'bun:test'
import {
  hasWildcards,
  matchWildcardPattern,
  parsePermissionRule,
} from '../shellRuleMatching.js'

// Copia de `ccnmt: packages/permission/src/__tests__/shellRuleMatching-edge.test.ts`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// ─── Sonda del conteo de barras invertidas de hasWildcards ──────────────

describe('hasWildcards — backslash counting precision', () => {
  test('zero backslashes (plain *) → unescaped → true', () => {
    expect(hasWildcards('foo *')).toBe(true)
  })

  test('one backslash (\\*) → escaped → false', () => {
    expect(hasWildcards('foo \\*')).toBe(false)
  })

  test('two backslashes (\\\\*) → escaped backslash + unescaped * → true', () => {
    expect(hasWildcards('foo \\\\*')).toBe(true)
  })

  test('three backslashes (\\\\\\*) → escaped backslash + escaped * → false', () => {
    expect(hasWildcards('foo \\\\\\*')).toBe(false)
  })

  test('four backslashes (\\\\\\\\*) → two escaped backslashes + unescaped * → true', () => {
    expect(hasWildcards('foo \\\\\\\\*')).toBe(true)
  })

  test('multiple wildcards — only one needs to be unescaped', () => {
    // Patrón: '\* foo *' — el primer * está escapado, el segundo no.
    expect(hasWildcards('\\* foo *')).toBe(true)
  })

  test('all wildcards escaped → false', () => {
    expect(hasWildcards('\\* \\*')).toBe(false)
  })

  test('legacy ":*" wins even if other * present in pattern', () => {
    // La función comprueba `endsWith(':*')` PRIMERO. Todo lo anterior se
    // ignora, aunque el patrón traiga antes un * sin escapar.
    // CRÍTICO: esta regla impide que la forma heredada «git commit:*» se
    // interprete por accidente como sintaxis de comodín.
    expect(hasWildcards('git commit:*')).toBe(false)
    expect(hasWildcards('foo * bar:*')).toBe(false)
  })

  test('asterisk at end without space prefix', () => {
    // 'foo*' (sin espacio) — sigue teniendo un * sin escapar.
    expect(hasWildcards('foo*')).toBe(true)
  })
})

// ─── Sonda de los casos límite de matchWildcardPattern ─────────────────

describe('matchWildcardPattern — multiline / heredoc commands', () => {
  test('wildcard matches commands with embedded newlines (dotAll)', () => {
    // La bandera 's' (dotAll) es crítica para que coincidan los comandos que
    // `splitCommand` devolvió con saltos de línea dentro (contenido de
    // heredoc).
    expect(
      matchWildcardPattern(
        'cat *',
        'cat <<EOF\nline1\nline2\nEOF',
      ),
    ).toBe(true)
  })

  test('plain "." (any char) within wildcard → matches newline (dotAll)', () => {
    // Con la bandera dotAll, cualquier '.' de la expresión regular casa con \n.
    expect(matchWildcardPattern('echo *', 'echo line1\nline2')).toBe(true)
  })
})

describe('matchWildcardPattern — escaped wildcards in middle', () => {
  test('"echo \\* foo" matches literal "echo * foo"', () => {
    expect(matchWildcardPattern('echo \\* foo', 'echo * foo')).toBe(true)
  })

  test('"echo \\* foo" does NOT match "echo X foo"', () => {
    expect(matchWildcardPattern('echo \\* foo', 'echo X foo')).toBe(false)
  })

  test('"\\\\*" (escaped backslash + unescaped wildcard) matches "\\anything"', () => {
    expect(matchWildcardPattern('\\\\*', '\\anything')).toBe(true)
    expect(matchWildcardPattern('\\\\*', '\\')).toBe(true)
  })
})

describe('matchWildcardPattern — trailing-wildcard space-optionality', () => {
  // La rama «endsWith(' .*') && unescapedStarCount === 1» hace que `git *`
  // case tanto con `git add` COMO con `git` a secas. Documenta esa ergonomía,
  // que carga peso.

  test('"git *" matches bare "git"', () => {
    expect(matchWildcardPattern('git *', 'git')).toBe(true)
  })

  test('"git *" matches "git add"', () => {
    expect(matchWildcardPattern('git *', 'git add')).toBe(true)
  })

  test('"git *" matches "git add foo"', () => {
    expect(matchWildcardPattern('git *', 'git add foo')).toBe(true)
  })

  test('"git *" does NOT match "git2"', () => {
    // El « ?args» opcional sólo entra si el resto va separado por espacios.
    expect(matchWildcardPattern('git *', 'git2')).toBe(false)
  })

  test('"git *" does NOT match "gitlab" (substring)', () => {
    expect(matchWildcardPattern('git *', 'gitlab')).toBe(false)
  })

  test('multi-wildcard pattern does NOT get the optional-suffix treatment', () => {
    // CRÍTICO: '* run *' casaría de forma incorrecta con 'npm run' si el
    // comodín de espacio final fuera opcional. La guarda
    // `unescapedStarCount === 1` lo impide.
    expect(matchWildcardPattern('* run *', 'npm run')).toBe(false)
    expect(matchWildcardPattern('* run *', 'npm run build')).toBe(true)
  })

  test('escaped trailing wildcard does NOT trigger optional suffix', () => {
    // El patrón 'git \*' tiene cero comodines sin escapar. La lógica del
    // sufijo opcional NO aplica — el patrón casa con 'git *' literal.
    expect(matchWildcardPattern('git \\*', 'git')).toBe(false)
    expect(matchWildcardPattern('git \\*', 'git *')).toBe(true)
  })
})

describe('matchWildcardPattern — regex special character escaping', () => {
  test('parens escaped — "(hello)" matches literal "(hello)" only', () => {
    expect(matchWildcardPattern('echo (hello)', 'echo (hello)')).toBe(true)
    expect(matchWildcardPattern('echo (hello)', 'echo hello')).toBe(false)
  })

  test('plus sign escaped — "a+" matches literal "a+"', () => {
    expect(matchWildcardPattern('echo a+', 'echo a+')).toBe(true)
    expect(matchWildcardPattern('echo a+', 'echo aaa')).toBe(false)
  })

  test('question mark escaped — "?" matches literal "?"', () => {
    expect(matchWildcardPattern('echo ?', 'echo ?')).toBe(true)
    expect(matchWildcardPattern('echo ?', 'echo a')).toBe(false)
  })

  test('dollar sign escaped — "$VAR" matches literal "$VAR"', () => {
    expect(matchWildcardPattern('echo $VAR', 'echo $VAR')).toBe(true)
  })

  test('square brackets escaped — "[abc]" is literal, not character class', () => {
    expect(matchWildcardPattern('echo [abc]', 'echo [abc]')).toBe(true)
    expect(matchWildcardPattern('echo [abc]', 'echo a')).toBe(false)
  })

  test('caret/dollar anchors escaped — pattern "^foo$" is literal', () => {
    expect(matchWildcardPattern('echo ^foo$', 'echo ^foo$')).toBe(true)
  })

  test('curly brace escaped — "{1,3}" is literal', () => {
    expect(matchWildcardPattern('echo {1,3}', 'echo {1,3}')).toBe(true)
  })

  test('pipe escaped — "a|b" is literal alt syntax escaped', () => {
    expect(matchWildcardPattern('echo a|b', 'echo a|b')).toBe(true)
    expect(matchWildcardPattern('echo a|b', 'echo a')).toBe(false)
    expect(matchWildcardPattern('echo a|b', 'echo b')).toBe(false)
  })

  test('single-quote escaped', () => {
    expect(matchWildcardPattern("echo 'hi'", "echo 'hi'")).toBe(true)
  })

  test('double-quote escaped', () => {
    expect(matchWildcardPattern('echo "hi"', 'echo "hi"')).toBe(true)
  })
})

describe('matchWildcardPattern — case insensitivity', () => {
  test('case-insensitive flag matches mixed case', () => {
    expect(matchWildcardPattern('GIT *', 'git add', true)).toBe(true)
  })

  test('case-insensitive flag false → matches case-sensitive', () => {
    expect(matchWildcardPattern('GIT *', 'git add', false)).toBe(false)
  })

  test('case-insensitive flag false by default', () => {
    expect(matchWildcardPattern('GIT *', 'git add')).toBe(false)
  })

  test('case-insensitive matches preserved escapes', () => {
    expect(matchWildcardPattern('ECHO \\*', 'echo *', true)).toBe(true)
  })
})

describe('matchWildcardPattern — full-string match (anchored)', () => {
  // El patrón va envuelto en ^...$. Los comodines tienen que cubrir el comando ENTERO.

  test('pattern without wildcard requires exact full-string match', () => {
    expect(matchWildcardPattern('npm install', 'npm install')).toBe(true)
    expect(matchWildcardPattern('npm install', 'npm install foo')).toBe(false)
    expect(matchWildcardPattern('npm install', 'sudo npm install')).toBe(false)
  })

  test('partial substring is NOT a match', () => {
    expect(matchWildcardPattern('git', 'git add')).toBe(false)
    expect(matchWildcardPattern('git add', 'git add foo')).toBe(false)
  })
})

describe('matchWildcardPattern — empty / whitespace edge', () => {
  test('empty pattern matches empty command', () => {
    expect(matchWildcardPattern('', '')).toBe(true)
  })

  test('empty pattern does NOT match non-empty command', () => {
    expect(matchWildcardPattern('', 'foo')).toBe(false)
  })

  test('"*" pattern matches anything', () => {
    expect(matchWildcardPattern('*', '')).toBe(true)
    expect(matchWildcardPattern('*', 'anything')).toBe(true)
    expect(matchWildcardPattern('*', 'with spaces')).toBe(true)
  })

  test('pattern with leading/trailing whitespace is trimmed', () => {
    // La función llama antes a `pattern.trim()`.
    expect(matchWildcardPattern('  git *  ', 'git add')).toBe(true)
    expect(matchWildcardPattern('  git *  ', 'git')).toBe(true)
  })
})

// ─── Sonda del orden de ramas de parsePermissionRule ───────────────────

describe('parsePermissionRule — branch precedence', () => {
  test('legacy ":*" wins over wildcard branch', () => {
    // 'foo:*' es un prefijo heredado aunque contenga un *.
    const r = parsePermissionRule('foo:*')
    expect(r.type).toBe('prefix')
    expect(r).toEqual({ type: 'prefix', prefix: 'foo' })
  })

  test('mixed ":*" with leading wildcard — STILL prefix (legacy precedence)', () => {
    // 'a*:*' — gana `endsWith(':*')`. El * anterior queda incluido en el
    // contenido del «prefijo». Esto documenta que lo heredado gana, para que
    // un refactor futuro no invierta la precedencia por accidente.
    const r = parsePermissionRule('a*:*')
    expect(r.type).toBe('prefix')
    expect((r as { prefix: string }).prefix).toBe('a*')
  })

  test('escaped wildcard is exact, not wildcard', () => {
    expect(parsePermissionRule('echo \\*')).toEqual({
      type: 'exact',
      command: 'echo \\*',
    })
  })

  test('plain ":" (no asterisk) is exact, not prefix', () => {
    // 'foo:' NO termina en ':*' → es exacto.
    expect(parsePermissionRule('foo:')).toEqual({
      type: 'exact',
      command: 'foo:',
    })
  })
})
