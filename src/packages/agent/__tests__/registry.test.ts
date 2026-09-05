// Suite del registro — TDD: se escribe antes que `src/registry.ts`.
//
// El contrato del registro sale del validador de `--agents` del ejecutable
// vendorizado 2.1.250, delimitado verbatim:
//
//   let o = Object.keys(r.data).filter((u)=>u.startsWith("-"));
//   if (o.length>0) return …`${…}: agent names must not start with '-'`;
//
// y del aviso de duplicado — que REPORTA cuál ganó, no lo elige: gana el
// último que `Map.set` escribió, y el aviso sólo sale dentro de una misma
// fuente y directorio (H-DOCS-1005):
//
//   [agents] Duplicate agent name '<agentType>' (<source>): <locations> — active: <locations[0]>
//
// y de la regla del ':' del cargador de frontmatter, tras `normalize("NFKC")`:
//
//   names must not contain ':' (reserved for plugin namespacing)
import { describe, expect, test } from 'bun:test'
import { NAME_MUST_NOT_CONTAIN_COLON, NAME_MUST_NOT_START_WITH_DASH, buildRegistry } from '../src/registry.ts'
import type { AgentDefinition } from '../src/types.ts'

function agent(name: string): AgentDefinition {
  return { name, description: `Agente ${name}`, prompt: 'Haz el trabajo.' }
}

describe('indexa por nombre', () => {
  test('la clave del registro es el nombre, y no queda dentro del valor', () => {
    const built = buildRegistry([agent('alfa'), agent('beta')])
    expect(built.ok).toBe(true)
    expect(Object.keys(built.ok ? built.registry : {})).toEqual(['alfa', 'beta'])
    expect((built.ok ? built.registry : {}).alfa).not.toHaveProperty('name')
  })

  test('cada valor pasa el esquema medido', () => {
    const built = buildRegistry([agent('alfa')])
    expect(built.ok && built.registry.alfa.description).toBe('Agente alfa')
  })
})

// CONTROLES NEGATIVOS — el registro tiene que poder rehusar. Un constructor
// que siempre devuelve `ok` no discrimina.
describe('rehúsa lo que el ejecutable rehúsa', () => {
  test('el nombre no puede empezar con guion medio, con el mensaje de la fuente', () => {
    const built = buildRegistry([agent('-oculto')])
    expect(built.ok).toBe(false)
    expect(built.ok ? [] : built.errors)
      .toContain(`-oculto: ${NAME_MUST_NOT_START_WITH_DASH}`)
  })

  test('el mensaje es el literal del ejecutable, no una paráfrasis', () => {
    expect(NAME_MUST_NOT_START_WITH_DASH)
      .toBe("agent names must not start with '-'")
  })

  test('el nombre no puede llevar dos puntos, ni disfrazados por NFKC', () => {
    // U+FF1A es el «dos puntos de ancho completo»: NFKC lo lleva a ':'.
    for (const name of ['plugin:agente', 'plugin\uFF1Aagente']) {
      const built = buildRegistry([agent(name)])
      expect(built.ok).toBe(false)
      expect(built.ok ? [] : built.errors).toContain(`${name}: ${NAME_MUST_NOT_CONTAIN_COLON}`)
    }
    expect(NAME_MUST_NOT_CONTAIN_COLON)
      .toBe("names must not contain ':' (reserved for plugin namespacing)")
  })

  test('el nombre duplicado se rehúsa en vez de que gane el último', () => {
    const built = buildRegistry([agent('alfa'), agent('alfa')])
    expect(built.ok).toBe(false)
    expect((built.ok ? [] : built.errors).join(' ')).toContain('alfa')
  })

  test('una definición inválida arrastra su ruta al mensaje', () => {
    const roto = { name: 'alfa', description: '', prompt: 'x' } as AgentDefinition
    const built = buildRegistry([roto])
    expect(built.ok).toBe(false)
    expect((built.ok ? [] : built.errors).join(' ')).toContain('alfa.description')
  })

  test('un registro vacío es válido y vacío — no es un error', () => {
    const built = buildRegistry([])
    expect(built.ok && Object.keys(built.registry).length).toBe(0)
  })
})
