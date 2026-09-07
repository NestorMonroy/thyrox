/**
 * Adaptado de `ccnmt: packages/swarm/src/core/__tests__/teammateColors.test.ts`.
 *
 * La fuente instala una AGENT_COLORS de binding vía `installSwarmAppRuntime`
 * con un fixture de 6 colores (`red, blue, green, yellow, magenta, cyan`) —
 * el propio comentario de la fuente aclara que el binding real es
 * irrelevante para lo que este archivo prueba. Aquí `AGENT_COLORS` YA ES
 * esa misma constante local (ver la divergencia declarada en
 * `../teammateColors.ts`), así que se omite todo el andamiaje de
 * instalación de bindings (`installSwarmAppRuntime`/`REQUIRED_BINDING_KEYS`)
 * — no hay binding que instalar.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  AGENT_COLORS,
  assignTeammateColor,
  clearTeammateColors,
  getTeammateColor,
} from '../teammateColors.js'

afterEach(() => {
  clearTeammateColors()
})

describe('assignTeammateColor', () => {
  test('returns the same color for the same teammateId on repeat calls (memoized)', () => {
    const first = assignTeammateColor('alice')
    const second = assignTeammateColor('alice')
    expect(first).toBe(second)
  })

  test('cycles through AGENT_COLORS in order', () => {
    const palette = AGENT_COLORS.slice(0, 3)
    const colors = ['t0', 't1', 't2'].map(assignTeammateColor)
    expect(colors).toEqual(palette as unknown as typeof colors)
  })

  test('wraps around when more teammates than palette size', () => {
    const ids = Array.from(
      { length: AGENT_COLORS.length + 1 },
      (_, i) => `t${i}`,
    )
    const colors = ids.map(assignTeammateColor)
    // los primeros AGENT_COLORS.length deberían ser la paleta completa
    expect(colors.slice(0, AGENT_COLORS.length)).toEqual(
      [...AGENT_COLORS] as unknown as typeof colors,
    )
    // el teammate (length+1)-ésimo obtiene el primer color de nuevo
    expect(colors[AGENT_COLORS.length]).toBe(AGENT_COLORS[0])
  })
})

describe('getTeammateColor', () => {
  test('returns undefined for an unassigned teammate', () => {
    expect(getTeammateColor('never-assigned')).toBeUndefined()
  })

  test('returns the assigned color after assignTeammateColor', () => {
    const assigned = assignTeammateColor('bob')
    expect(getTeammateColor('bob')).toBe(assigned)
  })
})

describe('clearTeammateColors', () => {
  test('forgets all assignments', () => {
    assignTeammateColor('alice')
    assignTeammateColor('bob')
    clearTeammateColors()
    expect(getTeammateColor('alice')).toBeUndefined()
    expect(getTeammateColor('bob')).toBeUndefined()
  })

  test('resets the color cycle index', () => {
    assignTeammateColor('alice')
    assignTeammateColor('bob')
    assignTeammateColor('charlie')
    clearTeammateColors()
    // Tras clear, la siguiente asignación debe recibir el PRIMER color de
    // nuevo, no el 4º. Esto atrapa una regresión donde colorIndex no se
    // reinicia.
    expect(assignTeammateColor('dave')).toBe(AGENT_COLORS[0])
  })
})
