/**
 * Control del productor de reglas.
 *
 * Que haria fallar a estos casos (sub-patron D): que el emisor publique algo
 * cuando NO puede resolver un parametro, o que resuelva el hogar del
 * consumidor dentro del proveedor. Los dos ocurrieron: el segundo se midio al
 * estrenar el emisor, con `--consumer kaupamex-api` resolviendo a
 * `thyrox/.claude/rules`.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RuleDefinition } from '../../src/rules/types.ts'
import { render, resolveParameters, toMarkdown, UnresolvedParameterError } from '../../src/rules/emit/markdown.ts'
import { consumerRulesDir, RULES_SEGMENT } from '../../src/rules/paths.ts'
import { emittedMarker } from '../../src/rules/provenance.ts'
import { stateDir } from '../../src/workbench/paths.ts'
import { RULES } from '../../src/rules/index.ts'

const universal: RuleDefinition = {
  name: 'probe-universal',
  scope: 'universal',
  parameters: [{ name: 'who', envVar: 'THYROX_PROBE_WHO', description: 'quien', fallback: 'nadie' }],
  body: 'La identidad es {{who}}.\n',
}

describe('el hogar del consumidor', () => {
  test('cae en el arbol del consumidor, no en el del proveedor', () => {
    const root = '/tmp/consumidor-de-prueba'
    expect(consumerRulesDir(root)).toBe(join(root, stateDir(root), RULES_SEGMENT))
    expect(consumerRulesDir(root)).not.toContain('thyrox')
  })
})

describe('la resolucion de parametros', () => {
  test('usa el fallback declarado cuando el entorno calla', () => {
    expect(resolveParameters(universal)).toEqual({ who: 'nadie' })
  })

  test('rehusa cuando no hay ni clave ni fallback', () => {
    const sinFallback: RuleDefinition = {
      ...universal,
      parameters: [{ name: 'who', envVar: 'THYROX_PROBE_AUSENTE', description: 'quien' }],
    }
    expect(() => resolveParameters(sinFallback)).toThrow(UnresolvedParameterError)
  })

  test('rehusa ante un marcador que la definicion no declara', () => {
    expect(() => render('hola {{fantasma}}', {})).toThrow(UnresolvedParameterError)
  })
})

describe('el frontmatter por scope', () => {
  test('una universal sale sin paths', () => {
    expect(toMarkdown(universal)).not.toContain('paths:')
  })

  test('una de dominio sin paths rehusa', () => {
    expect(() => toMarkdown({ ...universal, scope: 'domain' })).toThrow(UnresolvedParameterError)
  })

  test('una universal CON paths rehusa: el campo la apagaria', () => {
    expect(() => toMarkdown({ ...universal, paths: ['src/**'] })).toThrow(UnresolvedParameterError)
  })

  test('una de dominio con paths los emite en su frontmatter', () => {
    const emitido = toMarkdown({ ...universal, scope: 'domain', paths: ['src/**/*.py'] })
    expect(emitido.startsWith('---\npaths:\n  - "src/**/*.py"\n---\n')).toBe(true)
  })
})

describe('el sello de procedencia', () => {
  /**
   * Que haria fallar a estos casos (sub-patron D): que `toMarkdown` dejara de
   * estampar. El emisor seguiria produciendo un `.md` valido y el clasificador
   * contaria cada copia emitida como `divergente (0 linea(s))` — dos copias
   * identicas no se subsumen. El emisor empeoraria la cifra que lo justifica.
   *
   * La VENTANA la fija `check_rule_divergence.HEADER_LINES`, y se lee de su
   * fuente en vez de repetir el numero: dos literales de la misma constante
   * derivan en silencio.
   */
  const headerLines = (): number => {
    const fuente = readFileSync(
      join(import.meta.dir, '..', '..', 'src', 'verify', 'check_rule_divergence.py'),
      'utf8',
    )
    const hallado = fuente.match(/^HEADER_LINES = (\d+)$/m)
    if (!hallado) throw new Error('check_rule_divergence.py no declara HEADER_LINES')
    return Number(hallado[1])
  }

  test('una universal lo lleva en la primera linea', () => {
    const emitido = toMarkdown(universal)
    expect(emitido.split('\n')[0]).toBe(emittedMarker(universal.name))
  })

  test('una de dominio lo lleva DESPUES del frontmatter', () => {
    const dominio = { ...universal, scope: 'domain' as const, paths: ['src/**/*.py'] }
    const emitido = toMarkdown(dominio)
    // El frontmatter va primero o el cliente no lee `paths:`.
    expect(emitido.startsWith('---\npaths:\n  - "src/**/*.py"\n---\n')).toBe(true)
    expect(emitido).toContain(emittedMarker(dominio.name))
  })

  test('en los dos scopes cae DENTRO de la ventana del clasificador', () => {
    const ventana = headerLines()
    for (const definicion of [
      universal,
      { ...universal, scope: 'domain' as const, paths: ['src/**/*.py'] },
    ]) {
      const cabecera = toMarkdown(definicion).split('\n').slice(0, ventana)
      expect(cabecera.some((l) => l.includes(emittedMarker(definicion.name)))).toBe(true)
    }
  })

  test('el sello nombra la definicion, no un nombre fijo', () => {
    // Sin esto el sello seria un literal constante y no diria de DONDE sale.
    expect(emittedMarker('otra-regla')).not.toBe(emittedMarker(universal.name))
    expect(emittedMarker('otra-regla')).toContain('otra-regla.ts')
  })
})

describe('el registro', () => {
  test('cada regla declara todos los marcadores que su cuerpo usa', () => {
    for (const rule of RULES) {
      const declarados = new Set((rule.parameters ?? []).map((p) => p.name))
      const usados = [...rule.body.matchAll(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g)].map((m) => m[1])
      for (const nombre of usados) expect(declarados.has(nombre)).toBe(true)
    }
  })

  test('ninguna regla del registro fija una identidad literal del consumidor', () => {
    // El productor construye kaupamex hoy y cualquier multi-repo despues: una
    // identidad literal aqui lo ataria a un cliente.
    for (const rule of RULES) {
      expect(rule.body).not.toContain('jcg-admin')
      expect(rule.body).not.toContain('NestorMonroy')
    }
  })
})

describe('el productor y el cargador coinciden', () => {
  /**
   * `storage/claudemd.ts` es la mitad CONSUMIDORA que ya existia en el arbol:
   * decide que archivo cuenta como regla al cargarse. El productor es nuevo y
   * podria emitir a un hogar que el cargador no reconoce — dos fuentes de
   * verdad para el mismo predicado. Este caso las ata: lo que el emisor
   * escribe tiene que ser lo que el cargador lee.
   *
   * Que lo haria fallar: cambiar `RULES_SEGMENT` sin tocar el cargador.
   */
  test('toda ruta que el emisor compone la reconoce isMemoryFilePath', async () => {
    const { isMemoryFilePath } = await import('../../src/packages/storage/src/claudemd.ts')
    const root = '/tmp/consumidor-de-prueba'
    for (const rule of RULES) {
      const target = join(consumerRulesDir(root), `${rule.name}.md`)
      expect(isMemoryFilePath(target)).toBe(true)
    }
  })
})
