/**
 * Tests de la etapa que reparte los modulos en directorios.
 *
 * Lo que esta etapa NO puede hacer, y su razon medida: nombrar el paquete npm
 * de cada modulo. Sobre 2.1.258 —chunk de 5 493 162 B, 400 000 B muestreados—
 * los marcadores que lo delatarian dan **0**: `@license` 0, `Copyright (c)` 0,
 * `node_modules` 0, `require("` 0, `sourceMappingURL` 0. Y de 1628 modulos
 * `.js`, **1621 se llaman `chunk-XXXXXXXX.js`**; solo 7 conservan un nombre.
 *
 * Asi que el reparto se hace con la unica estructura que sobrevivio: el grafo
 * (1628 nodos, 13 182 aristas, 0 destinos colgantes). Es un reparto por PAPEL,
 * no por procedencia — y decirlo es la mitad del entregable.
 */
import { describe, expect, test } from 'bun:test'
import { organize, roleOf } from '../src/organize.ts'

/** Grafo minimo con los tres papeles: raiz, concentrador, hoja. */
const grafo = new Map<string, string[]>([
  ['raiz.js', ['hub.js']],
  ['otra-raiz.js', ['hub.js']],
  ['hub.js', ['hoja.js']],
  ['hoja.js', []],
])

describe('papel de un modulo en el grafo', () => {
  test('raiz — nadie lo importa', () => {
    expect(roleOf('raiz.js', grafo)).toBe('entrada')
  })

  test('hoja — no importa a nadie', () => {
    expect(roleOf('hoja.js', grafo)).toBe('hoja')
  })

  test('intermedio — lo importan y importa', () => {
    expect(roleOf('hub.js', grafo)).toBe('interno')
  })

  test('un modulo que no esta en el grafo no recibe papel', () => {
    // El proposito: inventarle un papel a lo que no se midio es exactamente
    // lo que esta etapa existe para no hacer.
    expect(roleOf('ausente.js', grafo)).toBeNull()
  })
})

describe('el plan de reparto', () => {
  test('cada modulo del grafo recibe destino, y ninguno mas', () => {
    const plan = organize(grafo)
    expect(plan.size).toBe(grafo.size)
    for (const destino of plan.values()) expect(destino).toMatch(/^(entrada|interno|hoja)\//)
  })

  test('el destino conserva el nombre del modulo — no se renombra', () => {
    // El nombre viene del binario. Renombrar romperia la unica cadena que
    // conecta una cita con el ejecutable del que salio.
    expect(organize(grafo).get('hub.js')).toBe('interno/hub.js')
  })

  test('el plan NO afirma procedencia', () => {
    // Control: si algun destino nombrara un paquete, la etapa estaria
    // publicando una clasificacion que sus datos no sostienen.
    for (const destino of organize(grafo).values()) {
      expect(destino).not.toMatch(/node_modules|vendor|npm/)
    }
  })
})
