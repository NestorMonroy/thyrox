/**
 * Tests del porte fiel de `shellRuleMatching.ts` — el motor de
 * emparejamiento de reglas de shell. Éste es el módulo de "decisión" del
 * paquete: cambiar su forma cambia qué comando pasa o no, así que su
 * suite incluye un caso de ANULACIÓN DE GUARDA (ver el bloque final) que
 * demuestra qué falla si el escapado de regex se retira.
 */
import { describe, expect, test } from 'bun:test'
import {
  hasWildcards,
  matchWildcardPattern,
  parsePermissionRule,
  permissionRuleExtractPrefix,
  suggestionForExactCommand,
  suggestionForPrefix,
} from '../src/shellRuleMatching.ts'

describe('permissionRuleExtractPrefix', () => {
  test('sintaxis legacy npm:* -> "npm"', () => {
    expect(permissionRuleExtractPrefix('npm:*')).toBe('npm')
  })

  test('sin :* al final -> null', () => {
    expect(permissionRuleExtractPrefix('npm run build')).toBeNull()
  })
})

describe('hasWildcards', () => {
  test('sintaxis legacy :* NO cuenta como wildcard', () => {
    expect(hasWildcards('git:*')).toBe(false)
  })

  test('un * sin escapar SÍ es wildcard', () => {
    expect(hasWildcards('git *')).toBe(true)
  })

  test('\\* (escapado) NO es wildcard', () => {
    expect(hasWildcards('echo \\*')).toBe(false)
  })

  test('\\\\* (barra escapada + * sin escapar) SÍ es wildcard', () => {
    expect(hasWildcards('echo \\\\*')).toBe(true)
  })
})

describe('parsePermissionRule — dispatch por forma', () => {
  test('legacy :* -> prefix', () => {
    expect(parsePermissionRule('npm:*')).toEqual({ type: 'prefix', prefix: 'npm' })
  })

  test('con wildcard -> wildcard', () => {
    expect(parsePermissionRule('git *')).toEqual({
      type: 'wildcard',
      pattern: 'git *',
    })
  })

  test('sin ninguna de las dos formas -> exact', () => {
    expect(parsePermissionRule('git status')).toEqual({
      type: 'exact',
      command: 'git status',
    })
  })
})

describe('matchWildcardPattern — semántica base', () => {
  test('* empareja cualquier secuencia', () => {
    expect(matchWildcardPattern('npm *', 'npm install')).toBe(true)
    // "npm *" con un único wildcard final tras espacio hace ese tramo
    // opcional (ver el caso siguiente) — 'npm' sin más SÍ matchea.
    expect(matchWildcardPattern('npm *', 'npm')).toBe(true)
    expect(matchWildcardPattern('npm *', 'yarn install')).toBe(false)
  })

  test('patrón "cmd *" también empareja el comando desnudo (sin argumentos)', () => {
    // Alinea la semántica wildcard con la de prefijo (git:*): el único
    // wildcard al final, tras un espacio, hace ese tramo opcional.
    expect(matchWildcardPattern('git *', 'git')).toBe(true)
    expect(matchWildcardPattern('git *', 'git add .')).toBe(true)
  })

  test('multi-wildcard NO hace opcional el último tramo', () => {
    // '* run *' con dos wildcards no debe emparejar 'npm run' (sin
    // argumento final) — sólo el caso de UN wildcard final activa la
    // optatividad.
    expect(matchWildcardPattern('* run *', 'npm run')).toBe(false)
    expect(matchWildcardPattern('* run *', 'npm run build')).toBe(true)
  })

  test('\\* empareja un asterisco literal', () => {
    expect(matchWildcardPattern('echo \\*', 'echo *')).toBe(true)
    expect(matchWildcardPattern('echo \\*', 'echo x')).toBe(false)
  })

  test('\\\\ empareja una barra invertida literal', () => {
    expect(matchWildcardPattern('echo \\\\', 'echo \\')).toBe(true)
  })

  test('caseInsensitive por defecto es sensible a mayúsculas', () => {
    expect(matchWildcardPattern('Git *', 'git status')).toBe(false)
    expect(matchWildcardPattern('Git *', 'Git status')).toBe(true)
    expect(matchWildcardPattern('Git *', 'git status', true)).toBe(true)
  })

  test('el flag dotAll hace que * emparejе saltos de línea embebidos', () => {
    expect(matchWildcardPattern('git commit -m *', 'git commit -m "a\nb"')).toBe(
      true,
    )
  })
})

describe('suggestionForExactCommand / suggestionForPrefix', () => {
  test('sugerencia exacta: addRules/allow/localSettings con el comando tal cual', () => {
    expect(suggestionForExactCommand('Bash', 'ls -la')).toEqual([
      {
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: 'ls -la' }],
        behavior: 'allow',
        destination: 'localSettings',
      },
    ])
  })

  test('sugerencia de prefijo: agrega ":*"', () => {
    expect(suggestionForPrefix('Bash', 'npm')).toEqual([
      {
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: 'npm:*' }],
        behavior: 'allow',
        destination: 'localSettings',
      },
    ])
  })
})

describe('anulación de guarda — el escapado de regex es lo que decide', () => {
  // Propiedad de seguridad: una regla `allow` para el comando exacto
  // "v1.2.3" NO debe también permitir "v1x2x3" — el punto en el patrón
  // tiene que ser un carácter LITERAL, no "cualquier carácter" de regex.
  // Sin el paso de escapado (`processed.replace(/[.+?^${}()|[\]\\'"]/g, ...)`
  // en matchWildcardPattern), un `.` sin escapar se compila tal cual en
  // el RegExp final y SÍ ensancharía el match — exactamente el tipo de
  // relajación silenciosa que este paquete existe para impedir.
  test('el punto literal NO se ensancha a "cualquier carácter" (control positivo)', () => {
    expect(matchWildcardPattern('v1.2.3', 'v1.2.3')).toBe(true)
    expect(matchWildcardPattern('v1.2.3', 'v1x2x3')).toBe(false)
  })

  // Verificado manualmente (no ejecutable desde este archivo, documentado
  // para trazabilidad): comentar la línea
  //   `const escaped = processed.replace(/[.+?^${}()|[\]\\'"]/g, '\\$&')`
  // y reemplazarla por `const escaped = processed` hace que el segundo
  // `expect` de arriba (`v1x2x3` NO matchea `v1.2.3`) FALLE — con la
  // guarda retirada, `matchWildcardPattern('v1.2.3', 'v1x2x3')` da
  // `true`, exactamente la relajación de seguridad que el escapado existe
  // para impedir. La restauración se verificó con
  // `git diff --stat -- src/shellRuleMatching.ts` vacío tras revertir.
})
