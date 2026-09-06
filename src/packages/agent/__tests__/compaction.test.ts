/**
 * Fidelidad del porte de la decisión de compactación contra el ejecutable
 * 2.1.258 (`bunfs-root/chunk-vw215j9f.js` del corpus versionado en
 * `_references/claude-code-bin/2.1.258/`).
 *
 * Cada aserción fija un valor que el ejecutable declara, y cita en su
 * comentario el símbolo minificado del que sale. Sin esa cita el test mide
 * nuestra implementación contra sí misma: pasaría igual si el porte fuera
 * fiel o si los dos lados estuvieran mal.
 */
import { describe, expect, test } from 'bun:test'
import {
  AUTOCOMPACT_BUFFER_TOKENS,
  BLOCKED_MARGIN_TOKENS,
  MAX_OUTPUT_TOKENS_FOR_SUMMARY,
  RAPID_REFILL_TRIP,
  autocompactLevel,
  autocompactThreshold,
  compactionCost,
  effectiveWindow,
  rapidRefillAction,
} from '../cost/compaction.ts'

describe('qZt — el techo de salida que la ventana efectiva reserva', () => {
  test('vale 20000', () => {
    // `var qZt=20000` — lo consume `MF`: `Math.min(xMe(e),qZt)`.
    expect(MAX_OUTPUT_TOKENS_FOR_SUMMARY).toBe(20_000)
  })

  test('MF(e,n) resta del window el mínimo entre la salida del modelo y ese techo', () => {
    // `function MF(e,n){let r=Math.min(xMe(e),qZt), {window:d}=wv(e,o); return d-r}`
    expect(effectiveWindow(1_000_000, 64_000)).toBe(980_000)
    // Un modelo cuya salida es MENOR que el techo reserva sólo su salida.
    expect(effectiveWindow(200_000, 8_192)).toBe(191_808)
  })
})

describe('nxe — el umbral en que dispara el autocompact', () => {
  test('es la ventana efectiva menos 13000', () => {
    // `function nxe(e,n){let r=e-13000; …; return r}`
    expect(AUTOCOMPACT_BUFFER_TOKENS).toBe(13_000)
    expect(autocompactThreshold(980_000)).toBe(967_000)
  })

  test('el override por porcentaje nunca sube por encima de ese techo', () => {
    // `return Math.min(Math.floor(e*(o/100)), r)` — `r` sigue siendo `e-13000`.
    expect(autocompactThreshold(980_000, 50)).toBe(490_000)
    expect(autocompactThreshold(980_000, 100)).toBe(967_000)
  })
})

describe('fZe — los cuatro niveles, y qué cambia al apagar la compactación', () => {
  const win = 1_000_000
  const out = 64_000
  const efectiva = effectiveWindow(win, out) // 980 000

  test('con autocompact ACTIVO el orden es ok -> warn -> compact -> blocked', () => {
    // `k=y-20000` (warn) · `e>=p` (compact) · `x=o-3000` (blocked)
    expect(autocompactLevel(10_000, win, out, true).level).toBe('ok')
    expect(autocompactLevel(950_000, win, out, true).level).toBe('warn')
    expect(autocompactLevel(967_000, win, out, true).level).toBe('compact')
    expect(autocompactLevel(977_000, win, out, true).level).toBe('blocked')
  })

  test('APAGADO el nivel `compact` no se emite: se va de warn a blocked', () => {
    // `let y=r.enabled?p:n` — sin autocompact la referencia deja de ser el
    // umbral y pasa a ser la ventana efectiva entera, y la rama de `compact`
    // está guardada por `r.enabled &&`.
    expect(autocompactLevel(967_000, win, out, false).level).toBe('warn')
    expect(autocompactLevel(977_000, win, out, false).level).toBe('blocked')
  })

  test('blocked llega 3000 tokens antes del final de la ventana efectiva', () => {
    // `x = o - 3000`, con `o` = ventana efectiva por defecto. NO es el
    // `window` del modelo: apagar la compactación no regala los 20 000 del
    // techo de salida ni los 3 000 del margen.
    expect(BLOCKED_MARGIN_TOKENS).toBe(3_000)
    expect(autocompactLevel(efectiva - 3_001, win, out, false).level).not.toBe('blocked')
    expect(autocompactLevel(efectiva - 3_000, win, out, false).level).toBe('blocked')
  })

  test('pctLeft se mide contra la referencia activa, no contra el window', () => {
    // `F=Math.max(0, Math.round((y-e)/y*100))` — con `y` distinto según
    // `enabled`, el MISMO contexto muestra dos porcentajes distintos.
    const conservado = autocompactLevel(500_000, win, out, true).pctLeft
    const apagado = autocompactLevel(500_000, win, out, false).pctLeft
    expect(conservado).toBe(48)
    expect(apagado).toBe(49)
  })
})

describe('rxe — el guard antithrashing', () => {
  test('a la tercera recarga rápida consecutiva devuelve trip', () => {
    // `function rxe(e){let n=N9r(e); return {action: n>=3?"trip":"proceed", …}}`
    expect(RAPID_REFILL_TRIP).toBe(3)
    expect(rapidRefillAction(0).action).toBe('proceed')
    expect(rapidRefillAction(2).action).toBe('proceed')
    expect(rapidRefillAction(3).action).toBe('trip')
  })
})

describe('el coste de NO comprimir se calcula, no se estima', () => {
  test('sin comprimir cada turno relee el contexto entero', () => {
    const c = compactionCost({
      modelId: 'claude-opus-5',
      contextTokens: 500_000,
      turnsAhead: 10,
      growthPerTurn: 0,
      cacheTtl: '5m',
    })
    // La unidad PRIMARIA es el token equivalente, no el USD: no depende de la
    // tarifa, así que esta cifra sigue siendo comparable cuando el catálogo de
    // la build cambie. 10 turnos × 500 000 leídos × 0.1 (cache_read/input del
    // tier 5/25) = 500 000 equivalentes.
    expect(c.withoutCompaction.readEquiv).toBeCloseTo(500_000, 0)
    // Y el USD es su derivada, un escalar: 500 000 × 5 / 1e6.
    expect(c.withoutCompaction.totalUsd).toBeCloseTo(2.5, 4)
  })

  test('cambiar de unidad cambia la lectura, NO el veredicto', () => {
    const req = {
      modelId: 'claude-opus-5', contextTokens: 500_000,
      turnsAhead: 10, growthPerTurn: 0, cacheTtl: '5m' as const,
    }
    const c = compactionCost(req)
    // El puente entre las dos unidades es un escalar POSITIVO, así que el
    // orden se conserva. Si no se conservara, una de las dos estaría
    // ponderando algo que la otra no — y el veredicto dependería de con qué
    // unidad se miró, que es exactamente lo que no puede pasar.
    const escalar = c.withoutCompaction.totalUsd / c.withoutCompaction.totalEquiv
    expect(c.withCompaction.totalUsd).toBeCloseTo(c.withCompaction.totalEquiv * escalar, 6)
    expect(c.withCompaction.totalEquiv < c.withoutCompaction.totalEquiv)
      .toBe(c.withCompaction.totalUsd < c.withoutCompaction.totalUsd)
  })

  test('la tercera unidad es el token CRUDO, y es la que decide `blocked`', () => {
    // Capacidad, no coste: lo que cabe en la ventana no se pondera, se cuenta.
    const c = compactionCost({
      modelId: 'claude-haiku-4-5', contextTokens: 150_000,
      turnsAhead: 5, growthPerTurn: 10_000, cacheTtl: '5m',
    })
    expect(c.withoutCompaction.finalContext).toBe(200_000)
    // Con ventana de 200 000 y salida por defecto, el horizonte llega al tope
    // y entonces el precio deja de ser la pregunta.
    expect(c.blocksAtTurn).not.toBeNull()
    expect(c.recommendation).toBe('comprimir-o-bloquea')
  })

  test('comprimir cambia relecturas caras por UNA escritura', () => {
    const c = compactionCost({
      modelId: 'claude-opus-5',
      contextTokens: 500_000,
      turnsAhead: 10,
      growthPerTurn: 0,
      cacheTtl: '5m',
    })
    // La escritura del resumen es del tamaño del resumen, no del contexto.
    expect(c.withCompaction.totalUsd).toBeLessThan(c.withoutCompaction.totalUsd)
    expect(c.breakEvenTurns).toBeGreaterThan(0)
  })

  test('con horizonte corto NO compensa: la escritura no se amortiza', () => {
    const c = compactionCost({
      modelId: 'claude-opus-5',
      contextTokens: 60_000,
      turnsAhead: 1,
      growthPerTurn: 0,
      cacheTtl: '5m',
    })
    expect(c.recommendation).toBe('no-comprimir')
  })

  test('el veredicto es «bloqueo» cuando el horizonte no cabe en la ventana', () => {
    // Aquí la pregunta deja de ser de coste: sin comprimir el turno no ocurre.
    const c = compactionCost({
      modelId: 'claude-opus-5',
      contextTokens: 900_000,
      turnsAhead: 20,
      growthPerTurn: 10_000,
      cacheTtl: '5m',
    })
    expect(c.blocksAtTurn).not.toBeNull()
    expect(c.recommendation).toBe('comprimir-o-bloquea')
  })
})
