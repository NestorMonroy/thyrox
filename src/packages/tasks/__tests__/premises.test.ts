/**
 * Verificación de premisas de tarea (bloque 14).
 *
 * Fuente: `niveles-de-retencion.md` (una descripción de tarea es nivel 3 —
 * persistida, declarada, sin verificar) reconciliado con `verificar_premisa.py`
 * (T-004). El control que discrimina es que una premisa cuyo `file:line` ya no
 * dice lo que la tarea supone se marque desactualizada, no que se lea el texto.
 */

import { describe, expect, test } from 'bun:test'
import { assessPremise, assessAll, type PremiseIo, type TaskPremise } from '../premises.ts'

/**
 * La premisa de una tarea es una hipotesis fechada. Leerla no mide el arbol:
 * es `niveles-de-retencion.md` nivel 3 —persistido, declarado, sin verificar—
 * y el sub-patron D de `metrica-decide-la-conclusion.md`.
 *
 * El mecanismo es abstracto a proposito: nada del vocabulario de este proyecto
 * entra en los tipos. La `PremiseIo` es lo unico que toca el mundo, asi que
 * estas pruebas no tocan disco.
 */

/** Un mundo declarado: lo que existe, que contiene, que responde. */
function io(mundo: {
  files?: Record<string, string>
  env?: Record<string, string>
  exits?: Record<string, number | null>
}): PremiseIo {
  const files = mundo.files ?? {}
  return {
    list: (glob) => Object.keys(files).filter((f) => f.startsWith(glob.replace(/\*.*$/, ''))),
    read: (path) => files[path] ?? '',
    exists: (path) => path in files,
    env: (name) => mundo.env?.[name],
    run: (command) => (command in (mundo.exits ?? {}) ? (mundo.exits as Record<string, number | null>)[command] : null),
  }
}

const mundoVacio = io({})

describe('los cinco veredictos, y ninguno se colapsa con otro (T-055)', () => {
  test('actionable — abierta y su bloqueo YA NO se cumple: el caso T-011', () => {
    const tarea: TaskPremise = {
      id: 'T-011',
      open: true,
      blockedWhile: [{ kind: 'env-absent', name: 'ANTHROPIC_API_KEY' }],
    }
    const r = assessPremise(tarea, io({ env: { ANTHROPIC_API_KEY: 'sk-...' } }))
    expect(r.verdict).toBe('actionable')
    // la razon nombra el predicado que dejo de cumplirse, no una frase generica
    expect(r.reason).toContain('ANTHROPIC_API_KEY')
  })

  test('blocked — abierta, y la razon esta MEDIDA, no citada del enunciado', () => {
    const tarea: TaskPremise = {
      id: 'T-090',
      open: true,
      blockedWhile: [{ kind: 'path-absent', path: 'src/provider/sse.ts' }],
    }
    const r = assessPremise(tarea, mundoVacio)
    expect(r.verdict).toBe('blocked')
    expect(r.reason).toContain('src/provider/sse.ts')
    expect(r.evidence).toHaveLength(1)
    expect(r.evidence[0].held).toBe(true)
  })

  test('overclaimed — cerrada y su enunciado nombra lo que NO esta: el caso T-015', () => {
    const tarea: TaskPremise = {
      id: 'T-015',
      open: false,
      claims: [
        { kind: 'symbol-present', symbol: 'SessionStart', in: 'src/hooks.ts' },
        { kind: 'symbol-present', symbol: 'SessionEnd', in: 'src/hooks.ts' },
      ],
    }
    const r = assessPremise(tarea, io({ files: { 'src/hooks.ts': "const E = ['SessionStart', 'PreToolUse']" } }))
    expect(r.verdict).toBe('overclaimed')
    expect(r.reason).toContain('SessionEnd')
    // y NO nombra al que si estaba: la razon acota el defecto
    expect(r.reason).not.toContain('SessionStart')
  })

  test('verified — cerrada y todo lo que afirma esta en el arbol', () => {
    const tarea: TaskPremise = {
      id: 'T-015',
      open: false,
      claims: [{ kind: 'symbol-present', symbol: 'SessionEnd', in: 'src/hooks.ts' }],
    }
    const r = assessPremise(tarea, io({ files: { 'src/hooks.ts': "const E = ['SessionEnd']" } }))
    expect(r.verdict).toBe('verified')
  })

  test('unmeasurable — una tarea SIN premisas declaradas no es verified', () => {
    const r = assessPremise({ id: 'T-021', open: true }, mundoVacio)
    expect(r.verdict).toBe('unmeasurable')
    expect(r.reason).toContain('sin premisas declaradas')
  })

  test('unmeasurable NO se colapsa con blocked: el silencio del instrumento no bloquea', () => {
    // `command-exit` cuyo comando no se pudo ejecutar: no se sabe si bloquea.
    const tarea: TaskPremise = {
      id: 'T-045',
      open: true,
      blockedWhile: [{ kind: 'command-exit', command: 'pg_isready', exit: 0 }],
    }
    const r = assessPremise(tarea, mundoVacio)
    expect(r.verdict).toBe('unmeasurable')
    expect(r.verdict).not.toBe('blocked')
    expect(r.reason).toContain('pg_isready')
  })

  test('un alcance que no casa NINGUN archivo es unmeasurable, no ausencia', () => {
    // Si el glob no casa nada, «el simbolo no esta» y «mire donde no era» dan
    // la misma salida. Eso es exactamente lo que el quinto veredicto separa.
    const tarea: TaskPremise = {
      id: 'T-017',
      open: false,
      claims: [{ kind: 'symbol-present', symbol: 'FileChanged', in: 'src/nada/' }],
    }
    const r = assessPremise(tarea, mundoVacio)
    expect(r.verdict).toBe('unmeasurable')
    expect(r.reason).toContain('src/nada/')
  })
})

describe('los siete predicados se evaluan sin conocer el dominio (T-054)', () => {
  const mundo = io({
    files: { 'src/a.ts': 'export const alfa = 1', 'src/b.ts': 'nada' },
    env: { PRESENTE: 'x' },
    exits: { 'true': 0, 'false': 1 },
  })
  const abierta = (p: TaskPremise['blockedWhile']) => assessPremise({ id: 'T', open: true, blockedWhile: p }, mundo)

  test('symbol-present distingue el simbolo del substring', () => {
    expect(abierta([{ kind: 'symbol-present', symbol: 'alfa', in: 'src/' }]).verdict).toBe('blocked')
    // `alf` es substring de `alfa` y NO es el simbolo: sin frontera de palabra
    // este caso pasaria y el predicado mediria otra cosa.
    expect(abierta([{ kind: 'symbol-present', symbol: 'alf', in: 'src/' }]).verdict).toBe('actionable')
  })

  test('symbol-absent es el complemento, no un alias', () => {
    expect(abierta([{ kind: 'symbol-absent', symbol: 'omega', in: 'src/' }]).verdict).toBe('blocked')
    expect(abierta([{ kind: 'symbol-absent', symbol: 'alfa', in: 'src/' }]).verdict).toBe('actionable')
  })

  test('path-exists y path-absent', () => {
    expect(abierta([{ kind: 'path-exists', path: 'src/a.ts' }]).verdict).toBe('blocked')
    expect(abierta([{ kind: 'path-absent', path: 'src/a.ts' }]).verdict).toBe('actionable')
    expect(abierta([{ kind: 'path-absent', path: 'src/z.ts' }]).verdict).toBe('blocked')
  })

  test('env-present y env-absent', () => {
    expect(abierta([{ kind: 'env-present', name: 'PRESENTE' }]).verdict).toBe('blocked')
    expect(abierta([{ kind: 'env-absent', name: 'PRESENTE' }]).verdict).toBe('actionable')
    expect(abierta([{ kind: 'env-absent', name: 'AUSENTE' }]).verdict).toBe('blocked')
  })

  test('command-exit compara el codigo declarado, no «exito»', () => {
    expect(abierta([{ kind: 'command-exit', command: 'true', exit: 0 }]).verdict).toBe('blocked')
    expect(abierta([{ kind: 'command-exit', command: 'false', exit: 0 }]).verdict).toBe('actionable')
    // un comando que SI corre y devuelve 1, con 1 declarado, se cumple
    expect(abierta([{ kind: 'command-exit', command: 'false', exit: 1 }]).verdict).toBe('blocked')
  })
})

describe('el agregado publica su denominador (T-056)', () => {
  const tareas: TaskPremise[] = [
    { id: 'A', open: true, blockedWhile: [{ kind: 'path-absent', path: 'x' }] },
    { id: 'B', open: true, blockedWhile: [{ kind: 'path-exists', path: 'x' }] },
    { id: 'C', open: false, claims: [{ kind: 'path-exists', path: 'x' }] },
    { id: 'D', open: true },
  ]

  test('cuenta cuantas se midieron sobre cuantas existen', () => {
    const r = assessAll(tareas, mundoVacio)
    expect(r.total).toBe(4)
    expect(r.measured).toBe(3)
    expect(r.byVerdict.unmeasurable).toBe(1)
    expect(r.byVerdict.blocked).toBe(1)      // A: el path sigue ausente
    expect(r.byVerdict.actionable).toBe(1)   // B: el path no existe → su bloqueo no se cumple
    expect(r.byVerdict.overclaimed).toBe(1)  // C: cerrada y afirma un path que no esta
  })

  test('la lista de accionables es lo que el orquestador consume', () => {
    const r = assessAll(tareas, mundoVacio)
    expect(r.actionable.map((a) => a.id)).toEqual(['B'])
  })
})

describe('lo que el enunciado da por supuesto (T-065)', () => {
  /** Un árbol donde `alfa` existe y `beta` no. */
  const mundo = io({ files: { 'src/uno.py': 'def alfa(): pass', 'src/dos.py': 'def gamma(): pass' } })

  test('una presuposición que se cumple deja la tarea donde estaba', () => {
    const a = assessPremise(
      { id: 'T-1', open: true, presupposes: [{ kind: 'symbol-absent', symbol: 'beta', in: 'src/**' }],
        blockedWhile: [{ kind: 'path-exists', path: 'src/uno.py' }] },
      mundo,
    )
    expect(a.verdict).toBe('blocked')
  })

  test('una presuposición falsa da `stale`, no `actionable`', () => {
    const a = assessPremise(
      { id: 'T-2', open: true, presupposes: [{ kind: 'symbol-absent', symbol: 'alfa', in: 'src/**' }] },
      mundo,
    )
    expect(a.verdict).toBe('stale')
    expect(a.reason).toContain('alfa')
  })

  test('`stale` gana sobre el bloqueo: re-encuadrar precede a despachar', () => {
    const a = assessPremise(
      { id: 'T-3', open: true,
        presupposes: [{ kind: 'symbol-absent', symbol: 'alfa', in: 'src/**' }],
        blockedWhile: [{ kind: 'path-exists', path: 'src/uno.py' }] },
      mundo,
    )
    expect(a.verdict).toBe('stale')
  })

  test('una presuposición que no se pudo medir NO es una presuposición rota', () => {
    const a = assessPremise(
      { id: 'T-4', open: true, presupposes: [{ kind: 'symbol-absent', symbol: 'alfa', in: 'no/casa/**' }] },
      mundo,
    )
    expect(a.verdict).toBe('unmeasurable')
  })

  test('también aplica a una tarea cerrada: lo que supuso puede haber cambiado', () => {
    const a = assessPremise(
      { id: 'T-5', open: false,
        presupposes: [{ kind: 'path-exists', path: 'src/fantasma.py' }],
        claims: [{ kind: 'symbol-present', symbol: 'alfa', in: 'src/**' }] },
      mundo,
    )
    expect(a.verdict).toBe('stale')
  })

  test('el agregado cuenta `stale` por separado y lo expone como lista', () => {
    const r = assessAll(
      [
        { id: 'T-6', open: true, presupposes: [{ kind: 'symbol-absent', symbol: 'alfa', in: 'src/**' }] },
        { id: 'T-7', open: true, blockedWhile: [{ kind: 'path-exists', path: 'src/uno.py' }] },
      ],
      mundo,
    )
    expect(r.byVerdict.stale).toBe(1)
    expect(r.stale.map((a) => a.id)).toEqual(['T-6'])
    expect(r.measured).toBe(2)
  })
})
