/**
 * Fidelidad del porte de la decisión de contexto contra el ejecutable 2.1.258
 * (`bunfs-root/chunk-vw215j9f.js` del corpus versionado en
 * `_references/claude-code-bin/2.1.258/`).
 *
 * Cada aserción fija un valor que el ejecutable declara y cita en su comentario
 * el símbolo minificado del que sale. Sin la cita el test compara nuestra
 * implementación consigo misma: pasaría igual si el porte fuera fiel o si los
 * dos lados estuvieran mal.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  AUTO_COMPACT_WINDOW_CAP,
  AUTO_COMPACT_WINDOW_FLOOR,
  BLOCKED_MARGIN_TOKENS,
  RAPID_REFILL_TRIP,
  THRASHING_MESSAGE,
  WARN_MARGIN_TOKENS,
  autoCompactEnabled,
  blockingWindow,
  compactionWindow,
  contextLevel,
  markCompacted,
  rapidRefill,
  resolveThreshold,
} from '../src/context/contextLevel.ts'
import { AUTOCOMPACT_BUFFER_TOKENS, effectiveContextWindow } from '../src/context/autocompact.ts'

const MODELO = 'claude-opus-5'
const EFECTIVA = effectiveContextWindow(MODELO)!

afterEach(() => {
  delete process.env.DISABLE_COMPACT
  delete process.env.DISABLE_AUTO_COMPACT
  delete process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
  delete process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE
  delete process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW
})

describe('MF — la ventana con la que de verdad se cuenta', () => {
  test('reserva la salida del modelo, acotada al techo de 20000', () => {
    // `function MF(e,n){let r=Math.min(xMe(e),qZt), {window:d}=wv(e,o); return d-r}`
    // opus-5: window 1e6, salida por defecto 64000 -> min(64000,20000)=20000.
    expect(EFECTIVA).toBe(980_000)
  })
})

describe('nxe — el umbral, y por qué el override sólo puede bajarlo', () => {
  test('sin override es la ventana efectiva menos 13000', () => {
    // `function nxe(e,n){let r=e-13000; …}`
    expect(resolveThreshold(MODELO)).toBe(EFECTIVA - AUTOCOMPACT_BUFFER_TOKENS)
  })

  test('un override de 50 lo baja a la mitad de la ventana efectiva', () => {
    // `Math.min(Math.floor(e*(o/100)), r)`
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '50'
    expect(resolveThreshold(MODELO)).toBe(Math.floor(EFECTIVA * 0.5))
  })

  test('un override de 100 NO desactiva el colchón: el Math.min lo retiene', () => {
    // Es la trampa del `Math.min`: `e*(100/100)` es `e`, y el otro brazo
    // sigue siendo `e-13000`, que gana.
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '100'
    expect(resolveThreshold(MODELO)).toBe(EFECTIVA - AUTOCOMPACT_BUFFER_TOKENS)
  })

  test('un override fuera de (0,100] se ignora', () => {
    // `o!==void 0 && !isNaN(o) && o>0 && o<=100`
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '0'
    expect(resolveThreshold(MODELO)).toBe(EFECTIVA - AUTOCOMPACT_BUFFER_TOKENS)
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = 'nada'
    expect(resolveThreshold(MODELO)).toBe(EFECTIVA - AUTOCOMPACT_BUFFER_TOKENS)
  })
})

describe('Qp — si la compactación está activa', () => {
  test('por defecto está activa', () => {
    // `return ko("autoCompactEnabled", !0).value` — el segundo argumento es
    // el default, y es `true`.
    expect(autoCompactEnabled()).toBe(true)
  })

  test('DISABLE_COMPACT la apaga', () => {
    // `function LZt(){return Boolean($e(process.env.DISABLE_COMPACT) || …)}`
    process.env.DISABLE_COMPACT = '1'
    expect(autoCompactEnabled()).toBe(false)
  })

  test('DISABLE_AUTO_COMPACT también', () => {
    // `… || a.DISABLE_AUTO_COMPACT`
    process.env.DISABLE_AUTO_COMPACT = '1'
    expect(autoCompactEnabled()).toBe(false)
  })

  test('el ajuste explícito gana sobre el default', () => {
    expect(autoCompactEnabled({ autoCompactEnabled: false })).toBe(false)
  })

  test('pero la variable de entorno gana sobre el ajuste', () => {
    // `if(LZt()) return !1` va ANTES de leer el ajuste: el orden es el porte.
    process.env.DISABLE_COMPACT = '1'
    expect(autoCompactEnabled({ autoCompactEnabled: true })).toBe(false)
  })
})

describe('fZe — los cuatro niveles', () => {
  test('con la compactación activa: ok -> warn -> compact -> blocked', () => {
    expect(contextLevel(10_000, MODELO).level).toBe('ok')
    expect(contextLevel(950_000, MODELO).level).toBe('warn')
    expect(contextLevel(967_000, MODELO).level).toBe('compact')
    expect(contextLevel(977_000, MODELO).level).toBe('blocked')
  })

  test('APAGADA el nivel compact no se emite: de warn se pasa a blocked', () => {
    // La rama está guardada por `r.enabled && e>=p`.
    process.env.DISABLE_COMPACT = '1'
    expect(contextLevel(967_000, MODELO).level).toBe('warn')
    expect(contextLevel(977_000, MODELO).level).toBe('blocked')
  })

  test('el muro NO se mueve al apagarla: efectiva menos 3000 en ambos casos', () => {
    // `x = o-3000`, con `o` = ventana efectiva por defecto — y esa rama no
    // consulta `enabled`. Apagar la compactación no regala ni un token.
    expect(BLOCKED_MARGIN_TOKENS).toBe(3_000)
    const frontera = EFECTIVA - BLOCKED_MARGIN_TOKENS
    expect(contextLevel(frontera, MODELO).level).toBe('blocked')
    process.env.DISABLE_COMPACT = '1'
    expect(contextLevel(frontera, MODELO).level).toBe('blocked')
    expect(contextLevel(frontera - 1, MODELO).level).not.toBe('blocked')
  })

  test('warn empieza 20000 antes de la referencia activa', () => {
    // `k = y-20000`
    expect(WARN_MARGIN_TOKENS).toBe(20_000)
    const umbral = resolveThreshold(MODELO)!
    expect(contextLevel(umbral - WARN_MARGIN_TOKENS, MODELO).level).toBe('warn')
    expect(contextLevel(umbral - WARN_MARGIN_TOKENS - 1, MODELO).level).toBe('ok')
  })

  test('pctLeft se mide contra la referencia activa, y por eso miente al apagar', () => {
    // `F=Math.max(0,Math.round((y-e)/y*100))` con `y = enabled ? p : n`:
    // el MISMO contexto reporta más margen con la compactación apagada.
    const activo = contextLevel(950_000, MODELO).pctLeft
    process.env.DISABLE_COMPACT = '1'
    const apagado = contextLevel(950_000, MODELO).pctLeft
    if (activo === null || apagado === null) {
      throw new Error('MODELO deberia estar en el catalogo: sin ventana no hay pctLeft que comparar')
    }
    expect(apagado).toBeGreaterThan(activo)
  })

  test('un modelo que el catálogo no conoce no decide nada', () => {
    // El silencio del instrumento no es permiso: sin ventana no hay nivel.
    expect(contextLevel(10_000, 'modelo-inexistente').level).toBe('unknown')
  })
})

describe('rxe — el guard antithrashing', () => {
  test('sin estado previo procede', () => {
    expect(rapidRefill(undefined).action).toBe('proceed')
  })

  test('cuenta sólo si la recarga fue DENTRO de los 3 turnos del compact', () => {
    // `e?.compacted===!0 && e.turnCounter<3 ? (…??0)+1 : 0`
    expect(rapidRefill({ compacted: true, turnCounter: 2, consecutiveRapidRefills: 0 })
      .consecutiveRapidRefills).toBe(1)
    // A partir del turno 3 el contador se REINICIA: no fue rápida.
    expect(rapidRefill({ compacted: true, turnCounter: 3, consecutiveRapidRefills: 2 })
      .consecutiveRapidRefills).toBe(0)
  })

  test('a la tercera consecutiva corta', () => {
    // `n>=3 ? "trip" : "proceed"`, con `var YZt=3`.
    expect(RAPID_REFILL_TRIP).toBe(3)
    expect(rapidRefill({ compacted: true, turnCounter: 0, consecutiveRapidRefills: 2 })
      .action).toBe('trip')
  })

  test('el mensaje nombra la causa real, que no es la compactación', () => {
    // Se cita verbatim a propósito: su valor está en decir que el problema es
    // una lectura demasiado grande. Parafrasearlo lo pierde.
    expect(THRASHING_MESSAGE).toContain('refilled to the limit within 3 turns')
    expect(THRASHING_MESSAGE).toContain('Try reading in smaller chunks')
  })

  test('markCompacted reinicia el turno y arrastra el contador', () => {
    // `function kZe(e,n){return {compacted:!0, turnId:e, turnCounter:0,
    //   consecutiveFailures:0, consecutiveRapidRefills:n}}`
    const s = markCompacted('t-7', 2)
    expect(s.compacted).toBe(true)
    expect(s.turnId).toBe('t-7')
    expect(s.turnCounter).toBe(0)
    expect(s.consecutiveRapidRefills).toBe(2)
  })
})

describe('wv/MF contra zZt — son DOS ventanas, y el porte usaba una', () => {
  // `function Fte(e,n,r,o){…return fZe(e,MF(n,p),d,zZt(n))}` — el segundo
  // argumento de `fZe` es la ventana de COMPACTACIÓN y el cuarto la de
  // BLOQUEO. `fZe` las declara distintas por defecto (`o=n`) y `Fte` las
  // separa siempre. El porte anterior pasaba la misma a las dos.
  test('sin ventana configurada las dos coinciden — por eso el defecto era invisible', () => {
    expect(compactionWindow(MODELO)).toBe(blockingWindow(MODELO))
  })

  test('una ventana configurada baja la de compactación y NO la de bloqueo', () => {
    // `wv`: `return {window: Math.min(d,n), configured:n, source:"settings"}`
    // — `Math.min` sólo puede bajar; `zZt` no consulta esa configuración.
    expect(compactionWindow(MODELO, 200_000)).toBe(200_000 - 20_000)
    expect(blockingWindow(MODELO)).toBe(EFECTIVA)
  })

  test('la configuración NUNCA sube por encima de la declarada', () => {
    // `Math.min(d,n)` con n > d devuelve d.
    expect(compactionWindow(MODELO, 5_000_000)).toBe(EFECTIVA)
  })

  test('CLAUDE_CODE_AUTO_COMPACT_WINDOW gana sobre el ajuste, con piso y techo', () => {
    // `Ete("CLAUDE_CODE_AUTO_COMPACT_WINDOW",…,pTe=1e5,zBe=1e6)` y luego
    // `Math.max(pTe,B.effective)`: el piso es 100 000 y el techo 1 000 000.
    process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = '300000'
    expect(compactionWindow(MODELO, 200_000)).toBe(300_000 - 20_000)
    process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = '50000'
    expect(compactionWindow(MODELO)).toBe(AUTO_COMPACT_WINDOW_FLOOR - 20_000)
    process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = '9000000'
    expect(compactionWindow(MODELO)).toBe(AUTO_COMPACT_WINDOW_CAP - 20_000)
  })

  test('un valor inválido NO aplica la rama — cae al ajuste, no al piso', () => {
    // `if(B.status!=="invalid")`: con `status:"invalid"` el `return` no ocurre
    // y la resolución sigue. Leer el piso aquí sería inventar un valor.
    process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = 'no-es-un-numero'
    expect(compactionWindow(MODELO, 200_000)).toBe(200_000 - 20_000)
  })

  test('con la compactación apagada la ventana configurada se descarta', () => {
    // `function MF(e,n){…let o=Qp()?n:void 0…}` — el ajuste sólo viaja a `wv`
    // si la compactación está activa.
    process.env.DISABLE_COMPACT = '1'
    expect(compactionWindow(MODELO, 200_000, { autoCompactEnabled: false })).toBe(EFECTIVA)
  })
})

describe('el tope duro se mide contra la ventana DECLARADA', () => {
  test('con ventana de compactación recortada, `blocked` sigue en la declarada', () => {
    // El defecto que esto cierra: con una sola ventana, un contexto de 200 000
    // se declaraba `blocked` — y el ejecutable lo bloquea en 977 000.
    const r = contextLevel(200_000, MODELO, { autoCompactWindow: 200_000 })
    expect(r.level).toBe('compact')
    expect(r.blocked).toBe(EFECTIVA - BLOCKED_MARGIN_TOKENS)
  })

  test('CONTROL — el mismo contexto sin la ventana recortada es `ok`', () => {
    expect(contextLevel(200_000, MODELO).level).toBe('ok')
  })
})

describe('CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE — la tercera variable, ausente del porte', () => {
  test('reemplaza el tope duro entero, no es un margen', () => {
    // `let v=r.testBlockingOverride, x=v!==void 0&&!isNaN(v)&&v>0?v:o-3000`
    // — sustituye a `o-3000`, así que NO se le resta nada.
    process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE = '50000'
    const r = contextLevel(50_000, MODELO)
    expect(r.level).toBe('blocked')
    expect(r.blocked).toBe(50_000)
  })

  test('un valor no numérico o ≤ 0 lo deja en el tope normal', () => {
    // `!isNaN(v)&&v>0` — las dos guardas del ejecutable.
    process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE = '0'
    expect(contextLevel(50_000, MODELO).blocked).toBe(EFECTIVA - BLOCKED_MARGIN_TOKENS)
    process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE = 'abc'
    expect(contextLevel(50_000, MODELO).blocked).toBe(EFECTIVA - BLOCKED_MARGIN_TOKENS)
  })

  test('`nl` acepta la forma con separadores que `parseInt` corta', () => {
    // `function nl(e){let n=String(e).trim();return N(n)??parseInt(n,10)}`
    // — el `trim` es parte del contrato.
    process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE = '  50000  '
    expect(contextLevel(50_000, MODELO).blocked).toBe(50_000)
  })
})

describe('remoteAutocompactState — la rama que el porte no tenía', () => {
  const frame = { enabled: true, effectiveWindow: 400_000, threshold: 300_000 }

  test('el umbral viene del servidor, no de `nxe`', () => {
    // `fZe(e,o.effectiveWindow,{…},zZt(n),o.threshold)` — el quinto argumento
    // es `d`, y `fZe` hace `let p=d??nxe(n,r)`: con `d` presente `nxe` no corre.
    const r = contextLevel(310_000, MODELO, { remote: frame })
    expect(r.level).toBe('compact')
    expect(r.threshold).toBe(300_000)
  })

  test('el frame remoto DESCARTA los dos overrides de entorno', () => {
    // `{enabled:o.enabled, precomputeBufferFraction:txe,
    //   testPctOverride:void 0, testBlockingOverride:void 0}` — verbatim.
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '10'
    process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE = '50000'
    const r = contextLevel(310_000, MODELO, { remote: frame })
    expect(r.threshold).toBe(300_000)
    expect(r.blocked).toBe(EFECTIVA - BLOCKED_MARGIN_TOKENS)
  })

  test('el tope duro sigue siendo LOCAL — `zZt(n)`, no el frame', () => {
    // Es la asimetría del ejecutable: adopta ventana, umbral y `enabled` del
    // servidor, y deriva el bloqueo del modelo. Un frame con ventana de
    // 400 000 no adelanta el muro a 397 000.
    expect(contextLevel(397_000, MODELO, { remote: frame }).level).not.toBe('blocked')
    expect(contextLevel(EFECTIVA - 2_000, MODELO, { remote: frame }).level).toBe('blocked')
  })

  test('`enabled:false` en el frame gana sobre el ajuste local', () => {
    const r = contextLevel(310_000, MODELO, {
      remote: { ...frame, enabled: false }, autoCompactEnabled: true,
    })
    expect(r.level).not.toBe('compact')
    expect(r.enabled).toBe(false)
  })

  test('sin frame, la resolución local no cambia — control de no-regresión', () => {
    const conFrame = contextLevel(310_000, MODELO, { remote: frame })
    const sinFrame = contextLevel(310_000, MODELO)
    expect(conFrame.level).not.toBe(sinFrame.level)
  })
})
