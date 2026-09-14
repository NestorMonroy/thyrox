import { describe, expect, test } from 'bun:test'
import { RTK_FILTERS, applyLineFilter, applyRtk, selectFilter, stripAnsi } from '../src/rtk/index.ts'

describe('cada filtro RTK pasa su propia muestra embebida', () => {
  // La muestra vive JUNTO al filtro (mismo criterio que los `tests:` inline
  // de OmniRoute): quien cambie una regla ve el control fallar en el mismo
  // archivo que edito, no en un fixture separado que se puede olvidar.
  for (const filter of RTK_FILTERS) {
    for (const sample of filter.tests) {
      test(`${filter.id} — ${sample.name}`, () => {
        const r = applyLineFilter(sample.input, filter)
        expect(r.text).toBe(sample.expected)
      })
    }
  }
})

describe('stripAnsi', () => {
  test('quita secuencias de escape ANSI reales', () => {
    const withColor = '\x1b[32mOK\x1b[0m texto plano'
    expect(stripAnsi(withColor)).toBe('OK texto plano')
  })
})

describe('selectFilter', () => {
  test('el comando decide sobre el contenido ambiguo', () => {
    const r = selectFilter('commit abc123\nAuthor: x', RTK_FILTERS, 'git log')
    expect(r?.filter.id).toBe('git-log')
  })
  test('sin comando, el contenido basta si el patron es suficientemente especifico', () => {
    const r = selectFilter('On branch main\nChanges not staged for commit:\n', RTK_FILTERS, null)
    expect(r?.filter.id).toBe('git-status')
  })
  test('nada matchea -> null, no cae a generic-output por accidente', () => {
    const r = selectFilter('hola mundo, salida sin forma reconocida', RTK_FILTERS, null)
    expect(r).toBeNull()
  })
  test('control de anulacion: sin ningun filtro registrado, selectFilter siempre da null', () => {
    const r = selectFilter('On branch main\ncommit abc123', [], 'git status')
    expect(r).toBeNull()
  })
})

describe('applyRtk', () => {
  test('confianza 0 (nada matcheo) devuelve el texto intacto', () => {
    const r = applyRtk('texto arbitrario sin forma conocida')
    expect(r.text).toBe('texto arbitrario sin forma conocida')
    expect(r.filterId).toBeNull()
  })
  test('un git status real se recorta y reporta su filtro', () => {
    const r = applyRtk(
      'On branch main\nChanges not staged for commit:\n  (use "git add" to update)\n\tmodified: a.ts\n',
      'git status',
    )
    expect(r.filterId).toBe('git-status')
    expect(r.text).not.toContain('(use "git add"')
    expect(r.text).toContain('modified: a.ts')
  })
})
