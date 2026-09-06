/**
 * Porte de `ccnmt: packages/agent/__tests__/eventMetadata.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia
 * es el idioma de la descripción.
 *
 * Tests de eventMetadata — helpers puros que llevan metadata de
 * tool/archivo a telemetría (eventos de Statsig en la fuente). Las
 * anotaciones de tipo sobre los valores de retorno documentan un
 * invariante explícito: estos valores NO son código ni rutas de archivo,
 * así que son seguros de enviar a analítica sin importar el flag de
 * opt-in.
 *
 * Una sanitización equivocada filtra el nombre real de un servidor MCP
 * (potencialmente la URL del usuario) al espacio de claves de analítica.
 * Un parseo de extensión equivocado desordena los dashboards de analítica
 * en cubos que no corresponden — y peor, filtra nombres de archivo a un
 * campo marcado como NO_CODE_OR_FILEPATHS.
 */
import { describe, expect, test } from 'bun:test'
import {
  extractMcpToolDetails,
  extractSkillName,
  getFileExtensionForAnalytics,
  getFileExtensionsFromBashCommand,
  isToolDetailsLoggingEnabled,
  mcpToolDetailsForAnalytics,
  sanitizeToolNameForAnalytics,
} from '../eventMetadata.ts'

describe('sanitizeToolNameForAnalytics', () => {
  test('mcp__github__create_issue → "mcp_tool" (colapsado)', () => {
    // Contrato documentado: TODAS las tools mcp__ colapsan a un único
    // cubo, así que el nombre del servidor (potencialmente una URL que
    // identifica al usuario) no se filtra al espacio de claves de
    // analítica.
    expect(sanitizeToolNameForAnalytics('mcp__github__create_issue')).toBe(
      'mcp_tool',
    )
  })

  test('mcp__user-server__do_thing → "mcp_tool" (cualquier servidor)', () => {
    expect(sanitizeToolNameForAnalytics('mcp__personal-mcp__x')).toBe(
      'mcp_tool',
    )
  })

  test('Bash → "Bash" (la incorporada pasa tal cual)', () => {
    expect(sanitizeToolNameForAnalytics('Bash')).toBe('Bash')
  })

  test('Edit → "Edit"', () => {
    expect(sanitizeToolNameForAnalytics('Edit')).toBe('Edit')
  })

  test('cadena vacía → cadena vacía', () => {
    expect(sanitizeToolNameForAnalytics('')).toBe('')
  })

  test('"mcp" sola (sin __) → no colapsa (no tiene el prefijo mcp__)', () => {
    // Sólo el prefijo mcp__ dispara el colapso, no mcp.
    expect(sanitizeToolNameForAnalytics('mcp')).toBe('mcp')
  })
})

describe('extractMcpToolDetails', () => {
  test('mcp__server__tool → { serverName, mcpToolName }', () => {
    expect(extractMcpToolDetails('mcp__github__create_issue')).toEqual({
      serverName: 'github',
      mcpToolName: 'create_issue',
    })
  })

  test('mcp__server__tool__con__varios__separadores conserva las partes finales', () => {
    expect(
      extractMcpToolDetails('mcp__server__a__b__c'),
    ).toEqual({ serverName: 'server', mcpToolName: 'a__b__c' })
  })

  test('sin el prefijo mcp__ → undefined', () => {
    expect(extractMcpToolDetails('Bash')).toBeUndefined()
    expect(extractMcpToolDetails('NotMcp__server__tool')).toBeUndefined()
  })

  test('mcp__server (sólo 2 partes) → undefined', () => {
    expect(extractMcpToolDetails('mcp__server')).toBeUndefined()
  })

  test('mcp__ sola → undefined', () => {
    expect(extractMcpToolDetails('mcp__')).toBeUndefined()
  })

  test('mcp__server__ (tool vacío) → undefined', () => {
    // Documentado: serverName o mcpToolName vacíos → undefined.
    expect(extractMcpToolDetails('mcp__server__')).toBeUndefined()
  })

  test('mcp____tool (server vacío) → undefined', () => {
    expect(extractMcpToolDetails('mcp____tool')).toBeUndefined()
  })
})

describe('mcpToolDetailsForAnalytics', () => {
  test('tool no-mcp → objeto vacío {}', () => {
    expect(mcpToolDetailsForAnalytics('Bash', undefined, undefined)).toEqual(
      {},
    )
  })

  test('tool mcp válida → mapeada a las claves mcpServerName + mcpToolName', () => {
    expect(
      mcpToolDetailsForAnalytics(
        'mcp__github__create_issue',
        undefined,
        undefined,
      ),
    ).toEqual({
      mcpServerName: 'github',
      mcpToolName: 'create_issue',
    })
  })

  test('los argumentos mcpServerType + baseUrl se ignoran (prefijo underscore intencional)', () => {
    const r = mcpToolDetailsForAnalytics(
      'mcp__github__x',
      'http',
      'https://api.example.com/secret',
    )
    expect(r).toEqual({
      mcpServerName: 'github',
      mcpToolName: 'x',
    })
    // El tipo/URL del servidor NO debe filtrarse al resultado.
    expect(JSON.stringify(r)).not.toContain('http')
    expect(JSON.stringify(r)).not.toContain('example.com')
  })
})

describe('extractSkillName', () => {
  test('tool Skill con input de skill válido → el nombre del skill', () => {
    expect(extractSkillName('Skill', { skill: 'commit' })).toBe('commit')
  })

  test('tool que no es Skill → undefined sin importar el input', () => {
    expect(extractSkillName('Bash', { skill: 'commit' })).toBeUndefined()
  })

  test('tool Skill sin input → undefined', () => {
    expect(extractSkillName('Skill', null)).toBeUndefined()
    expect(extractSkillName('Skill', undefined)).toBeUndefined()
  })

  test('tool Skill con input que no es un objeto → undefined', () => {
    expect(extractSkillName('Skill', 'commit')).toBeUndefined()
    expect(extractSkillName('Skill', 42)).toBeUndefined()
  })

  test('tool Skill con objeto sin la clave skill → undefined', () => {
    expect(extractSkillName('Skill', { args: '-m foo' })).toBeUndefined()
  })

  test('tool Skill con valor de skill que no es cadena → undefined', () => {
    expect(extractSkillName('Skill', { skill: 42 })).toBeUndefined()
    expect(extractSkillName('Skill', { skill: null })).toBeUndefined()
  })
})

describe('getFileExtensionForAnalytics', () => {
  test('archivo normal → extensión en minúsculas sin el punto', () => {
    expect(getFileExtensionForAnalytics('foo.ts')).toBe('ts')
    expect(getFileExtensionForAnalytics('bar.tsx')).toBe('tsx')
    expect(getFileExtensionForAnalytics('a.JSON')).toBe('json')
  })

  test('ruta absoluta → sólo la extensión', () => {
    expect(getFileExtensionForAnalytics('/etc/passwd.bak')).toBe('bak')
  })

  test('sin extensión → undefined', () => {
    expect(getFileExtensionForAnalytics('Makefile')).toBeUndefined()
    expect(getFileExtensionForAnalytics('foo')).toBeUndefined()
  })

  test('archivo oculto sin extensión propia → undefined', () => {
    // path.extname('.bashrc') devuelve '' en POSIX (se trata como sin
    // extensión).
    expect(getFileExtensionForAnalytics('.bashrc')).toBeUndefined()
  })

  test('extensión > 10 caracteres → "other" (protección de PII: una extensión larga podría parecer un nombre de archivo)', () => {
    expect(
      getFileExtensionForAnalytics('foo.verylongextensionname'),
    ).toBe('other')
  })

  test('extensión de exactamente 10 caracteres → se conserva (límite)', () => {
    // El ratchet es normalized.length > 10, así que 10 caracteres pasa.
    expect(getFileExtensionForAnalytics('x.abcdefghij')).toBe('abcdefghij')
  })

  test('archivo con varios puntos (foo.tar.gz) → sólo la última extensión', () => {
    expect(getFileExtensionForAnalytics('foo.tar.gz')).toBe('gz')
  })

  test('punto final (foo.) → undefined', () => {
    // path.extname('foo.') devuelve '.', que la función rechaza.
    expect(getFileExtensionForAnalytics('foo.')).toBeUndefined()
  })
})

describe('getFileExtensionsFromBashCommand', () => {
  test('comando con un archivo → su extensión', () => {
    expect(getFileExtensionsFromBashCommand('cat foo.ts')).toBe('ts')
  })

  test('varios archivos: extensiones sin duplicar, unidas por coma', () => {
    expect(
      getFileExtensionsFromBashCommand('mv a.ts b.ts c.tsx'),
    ).toBe('ts,tsx')
  })

  test('comando sin extensiones de archivo → undefined', () => {
    expect(getFileExtensionsFromBashCommand('ls')).toBeUndefined()
  })

  test('simulatedSedEditFilePath: la extensión se incluye aunque no esté en el comando', () => {
    expect(
      getFileExtensionsFromBashCommand('sed -i s/x/y/ foo', 'foo.json'),
    ).toBe('json')
  })

  test('simulatedSedEditFilePath deduplica con los tokens del comando', () => {
    expect(
      getFileExtensionsFromBashCommand('cat foo.json bar.txt', 'baz.json'),
    ).toBe('json,txt')
  })

  test('tokens que no son archivo con puntos: falso positivo (heurística de mejor esfuerzo)', () => {
    // Limitación documentada: los tokens del comando se parten por
    // espacio y a cada pieza se le toma su extname. Así que
    // `npm i lodash@1.0.0` metería `0` como extensión en el cubo. Este
    // test fija esa limitación.
    const r = getFileExtensionsFromBashCommand('echo abc.txt')
    expect(r).toBe('txt')
  })
})

describe('isToolDetailsLoggingEnabled', () => {
  test('devuelve boolean (no lanza)', () => {
    expect(typeof isToolDetailsLoggingEnabled()).toBe('boolean')
  })
})
