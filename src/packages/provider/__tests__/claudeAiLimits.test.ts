/**
 * Porte del medidor de límite de uso, contra `../src/claudeAiLimits.ts`.
 *
 * Por qué este porte sigue al BINARIO y no a la fuente TypeScript
 * ===============================================================
 *
 * `ccnmt: packages/provider/src/claudeAiLimits.ts` y el binario distribuido
 * divergen, y en cada punto medido el binario va por delante. La build que
 * gobierna es **2.1.274**, vendorizada en `_references/claude-code-bin/`.
 *
 * | eje                        | ccnmt (TS)             | 2.1.274                      |
 * |----------------------------|------------------------|------------------------------|
 * | ventanas extraídas         | 2                      | 4 (`x0`)                     |
 * | cabeceras por ventana      | 2                      | **3** (+ `-surpassed-threshold`) |
 * | condición de inclusión     | exige AMBAS            | **cualquiera de las tres**   |
 * | campos de la ventana       | requeridos             | **opcionales**               |
 * | parseo de la cabecera      | `Number(x)`            | `vot` — vacío/no finito → `undefined` |
 * | filtro de frescura         | ninguno                | `bPn`, **en milisegundos**   |
 * | validador de finitud       | implícito (`!== null`) | `W7`, sobre `isFinite`       |
 * | redondeo del reset         | `Number(reset)`        | `Math.round(…)`              |
 *
 * El binario es el cliente que efectivamente corre, así que gobierna. La
 * divergencia se declara aquí en vez de omitirse, según
 * `porte-completo-no-parcial.md`.
 *
 * El ancla de la extracción es el LITERAL, no el binding
 * ======================================================
 *
 * La tabla de ventanas se llamaba `E0e` en 2.1.266 y se llama `x0` en 2.1.274
 * — mismo mecanismo, otro nombre. Por eso la cadena se recuperó anclando por
 * el literal (`anthropic-ratelimit-unified-`, que vive en el TemplateHead de
 * `szo`) y no por el identificador: un extractor por nombre habría devuelto
 * cero sobre la build nueva, y ese cero se leería como «el mecanismo ya no
 * está». Los bindings de esta suite se citan como efímeros, entre paréntesis.
 *
 * Qué falsifica esta suite
 * ========================
 *
 * `H-DOCS-1274` afirma que el límite de uso «no expone medidor consultable
 * [...] sin cifra de cuota ni tiempo de reset». El caso de fidelidad ejecuta
 * el recipe `jq` que el propio cliente publica —extraído del corpus en tiempo
 * de prueba, no transcrito— contra el payload que compone ESTE porte. Si el
 * medidor no estuviera expuesto, el recipe del cliente no resolvería cifra
 * alguna.
 *
 * El defecto de aquella afirmación es el sub-patrón C de
 * `metrica-decide-la-conclusion.md`: se midió el log de diagnóstico —el
 * significante— y se concluyó sobre la superficie expuesta de la plataforma
 * —el significado—. Medido: el log registra `rate_limit_error` (6 archivos) y
 * **cero** cabeceras `anthropic-ratelimit-unified`, a las que es ciego por
 * construcción.
 */
import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  RATE_LIMIT_WINDOWS,
  currentLimits,
  emitStatusChange,
  readCurrentLimits,
  resetCurrentLimits,
  statusListeners,
  WINDOW_HORIZON_SECONDS,
  composeRateLimitsPayload,
  extractRawUtilization,
  filterFreshWindows,
  isFiniteWindow,
  isFreshWindow,
  isUsableWindow,
  parseHeaderNumber,
  projectCompleteWindows,
  windowSignature,
} from '../src/claudeAiLimits'

/*
 * El corpus es el CHUNK, no un volcado de cadenas.
 *
 * `2.1.266` trae `claude_strings.txt`; la build vendorizada de `2.1.274` trae
 * `bunfs-root/` y su manifiesto, y NO el volcado — son 47 MB y el disco de
 * esta sesión no los admite (`df` da tres cifras de MB libres). El recipe vive
 * igual en el chunk, en su propia línea dentro de una plantilla multilínea, y
 * el extractor de abajo lo recupera por su literal.
 */
const CORPUS = join(
  import.meta.dir,
  '..', '..', '..', '..',
  '_references', 'claude-code-bin', '2.1.274', 'bunfs-root', 'chunk-ayyj05ne.js',
)

function headersOf(pairs: Record<string, string>): Headers {
  const h = new Headers()
  for (const [k, v] of Object.entries(pairs)) h.set(k, v)
  return h
}

/** Una época realista en milisegundos, que es la unidad que `bPn` espera. */
const NOW_MS = 1_800_000_000_000
const NOW_S = NOW_MS / 1000

describe('el catálogo de ventanas sigue al binario, no a la fuente TS', () => {
  test('recorre las cuatro ventanas que la tabla declara (`x0`)', () => {
    expect(RATE_LIMIT_WINDOWS.map(([name]) => name)).toEqual([
      'five_hour',
      'seven_day',
      'seven_day_overage_included',
      'overage',
    ])
  })

  test('con la abreviatura que viaja en el nombre de la cabecera', () => {
    expect(RATE_LIMIT_WINDOWS.map(([, abbrev]) => abbrev)).toEqual([
      '5h', '7d', '7d_oi', 'overage',
    ])
  })
})

describe('parseHeaderNumber — el parseo de la cabecera (`vot`)', () => {
  test('una cabecera numérica da su número', () => {
    expect(parseHeaderNumber('0.87')).toBe(0.87)
  })

  test('la cabecera ausente da `undefined`', () => {
    expect(parseHeaderNumber(null)).toBeUndefined()
  })

  test('una cabecera no numérica da `undefined`, no NaN', () => {
    expect(parseHeaderNumber('n/a')).toBeUndefined()
  })

  /*
   * CONTROL QUE DISCRIMINA — es la única divergencia DENTRO del rango finito,
   * y por eso la que un fixture descuidado no separa.
   *
   * `Number('')` es **0**: un valor finito, que pasa `W7`, sobrevive al filtro
   * de frescura y se publica como «0 % consumido». Con `'n/a'` las dos
   * implementaciones coinciden (NaN no es finito), así que un caso construido
   * sólo con basura textual pasaría con el parseo viejo y con el nuevo — no
   * mediría nada. La cadena vacía es lo que las separa.
   *
   * Anulación: sustituir `parseHeaderNumber` por `Number` hace caer este caso
   * y el de `extractRawUtilization` que lo ejerce sobre la cabecera; ninguno más.
   */
  test('la cadena VACÍA da `undefined` — `Number("")` daría 0, un cero fabricado', () => {
    expect(Number('')).toBe(0)
    expect(parseHeaderNumber('')).toBeUndefined()
  })
})

describe('extractRawUtilization — tres cabeceras, campos opcionales (`szo`)', () => {
  test('una ventana con las tres cabeceras las extrae todas', () => {
    const got = extractRawUtilization(headersOf({
      'anthropic-ratelimit-unified-5h-utilization': '0.87',
      'anthropic-ratelimit-unified-5h-reset': '1800000000',
      'anthropic-ratelimit-unified-5h-surpassed-threshold': '0.8',
    }))
    expect(got).toEqual({
      five_hour: { utilization: 0.87, resets_at: 1800000000, surpassedThreshold: 0.8 },
    })
  })

  test('el reset se REDONDEA, como hace el binario', () => {
    const got = extractRawUtilization(headersOf({
      'anthropic-ratelimit-unified-7d-utilization': '0.5',
      'anthropic-ratelimit-unified-7d-reset': '1800000000.7',
    }))
    expect(got.seven_day?.resets_at).toBe(1800000001)
  })

  /*
   * La divergencia de fondo con 2.1.266: falta una cabecera y la ventana SÍ
   * entra, con el campo ausente. La mitad medida de una ventana es información
   * —un umbral rebasado sin reposición sigue siendo un aviso— y el descarte lo
   * hace después quien lo necesita completo (`projectCompleteWindows`, `W7`).
   */
  test('con sólo la utilización, la ventana entra con ese campo y nada más', () => {
    expect(extractRawUtilization(headersOf({
      'anthropic-ratelimit-unified-5h-utilization': '0.87',
    }))).toEqual({ five_hour: { utilization: 0.87 } })
  })

  test('con sólo el umbral rebasado, también', () => {
    expect(extractRawUtilization(headersOf({
      'anthropic-ratelimit-unified-7d-surpassed-threshold': '0.9',
    }))).toEqual({ seven_day: { surpassedThreshold: 0.9 } })
  })

  test('faltando las TRES, la ventana no entra — el `continue` de la fuente', () => {
    expect(extractRawUtilization(headersOf({
      'anthropic-ratelimit-unified-overage-utilization': '0.1',
    }))).toEqual({ overage: { utilization: 0.1 } })
    expect(extractRawUtilization(headersOf({}))).toEqual({})
  })

  test('una cabecera VACÍA no fabrica un cero: la ventana queda sin ese campo', () => {
    // Ejerce `parseHeaderNumber` por el camino real. Con `Number` la ventana
    // saldría `{ utilization: 0, resets_at: 1800000000 }` — un 0 % inventado.
    const got = extractRawUtilization(headersOf({
      'anthropic-ratelimit-unified-5h-utilization': '',
      'anthropic-ratelimit-unified-5h-reset': '1800000000',
    }))
    expect(got).toEqual({ five_hour: { resets_at: 1800000000 } })
  })

  test('las cuatro ventanas se extraen a la vez', () => {
    const h: Record<string, string> = {}
    for (const [, abbrev] of RATE_LIMIT_WINDOWS) {
      h[`anthropic-ratelimit-unified-${abbrev}-utilization`] = '0.1'
      h[`anthropic-ratelimit-unified-${abbrev}-reset`] = '1800000000'
    }
    expect(Object.keys(extractRawUtilization(headersOf(h))).sort()).toEqual(
      RATE_LIMIT_WINDOWS.map(([n]) => n).sort(),
    )
  })
})

describe('isFiniteWindow — el validador de finitud (`W7`)', () => {
  test('acepta la ventana con ambos finitos', () => {
    expect(isFiniteWindow({ utilization: 0, resets_at: 0 })).toBe(true)
  })

  test('rechaza la ausente', () => {
    expect(isFiniteWindow(undefined)).toBe(false)
  })

  test('rechaza la ventana a medias, ahora que los campos son opcionales', () => {
    expect(isFiniteWindow({ utilization: 0.5 })).toBe(false)
    expect(isFiniteWindow({ surpassedThreshold: 0.8 })).toBe(false)
  })

  // El control que discrimina: `Number('abc')` es NaN, y NaN pasaría
  // cualquier comparación de tipo. `isFinite` es lo que lo ataja.
  test('rechaza NaN, que es el producto de una cabecera no numérica', () => {
    expect(isFiniteWindow({ utilization: Number('abc'), resets_at: 1 })).toBe(false)
    expect(isFiniteWindow({ utilization: 1, resets_at: Number('') / 0 })).toBe(false)
  })
})

describe('isUsableWindow — el predicado de usabilidad (`izo`)', () => {
  /*
   * NO es `W7` con otro nombre: su universo es más ancho a propósito. El
   * binario lo consume en `deriveTrackedLimits` para decidir si una lectura
   * entra al estado; un umbral rebasado SIN reposición sigue siendo usable
   * ahí, y `W7` lo rechazaría.
   */
  test('el umbral rebasado basta, aunque falte todo lo demás', () => {
    expect(isUsableWindow({ surpassedThreshold: 0.8 })).toBe(true)
  })

  test('utilización y reposición juntas bastan', () => {
    expect(isUsableWindow({ utilization: 0.5, resets_at: 1 })).toBe(true)
  })

  test('la utilización SOLA no basta', () => {
    expect(isUsableWindow({ utilization: 0.5 })).toBe(false)
  })

  test('la ventana vacía no es usable', () => {
    expect(isUsableWindow({})).toBe(false)
  })
})

describe('projectCompleteWindows — la proyección a ventanas completas (`dPn`)', () => {
  test('conserva la ventana completa y descarta sus campos extra', () => {
    expect(projectCompleteWindows({
      five_hour: { utilization: 0.5, resets_at: 10, surpassedThreshold: 0.4 },
    })).toEqual({ five_hour: { utilization: 0.5, resets_at: 10 } })
  })

  test('descarta la ventana a medias', () => {
    expect(projectCompleteWindows({
      seven_day: { surpassedThreshold: 0.9 },
      overage: { utilization: 0.1 },
    })).toEqual({})
  })
})

describe('windowSignature — la clave de firma (`V8`)', () => {
  /*
   * El binario la usa para no reemitir una lectura que no cambió
   * (`lastEmittedWindowParts`). El redondeo al entero es parte del contrato:
   * dos utilizaciones que difieren por debajo del punto porcentual son la
   * MISMA lectura a efectos de emisión.
   */
  test('compone porcentaje redondeado y reposición', () => {
    expect(windowSignature({ utilization: 0.871, resets_at: 1800000000 }))
      .toBe('87@1800000000')
  })

  test('dos lecturas que difieren por debajo del punto dan la misma firma', () => {
    expect(windowSignature({ utilization: 0.871, resets_at: 7 }))
      .toBe(windowSignature({ utilization: 0.8714, resets_at: 7 }))
  })

  test('y un reset distinto da firma distinta', () => {
    expect(windowSignature({ utilization: 0.5, resets_at: 7 }))
      .not.toBe(windowSignature({ utilization: 0.5, resets_at: 8 }))
  })
})

describe('isFreshWindow — el filtro de frescura, en MILISEGUNDOS (`bPn`)', () => {
  test('la ventana que vence dentro del horizonte sobrevive', () => {
    expect(isFreshWindow({ utilization: 0.5, resets_at: NOW_S + 3600 }, NOW_MS)).toBe(true)
  })

  test('la ya vencida se descarta', () => {
    expect(isFreshWindow({ utilization: 0.5, resets_at: NOW_S - 1 }, NOW_MS)).toBe(false)
  })

  test('y la que cae más allá del horizonte, también', () => {
    expect(isFreshWindow(
      { utilization: 0.5, resets_at: NOW_S + WINDOW_HORIZON_SECONDS }, NOW_MS,
    )).toBe(false)
  })

  test('el horizonte es un año en segundos', () => {
    expect(WINDOW_HORIZON_SECONDS).toBe(31536000)
  })

  /*
   * CONTROL QUE DISCRIMINA — la unidad equivocada NO revienta: vacía.
   *
   * Pasar segundos donde la fuente espera milisegundos divide por mil otra
   * vez, así que el «ahora» cae en 1970 y TODA reposición real queda más allá
   * del horizonte de un año. El payload sale vacío y ese vacío se lee como «no
   * hay medidor» — el sub-patrón D con el propio filtro como sujeto, que es
   * exactamente la conclusión que `H-DOCS-1274` publicó.
   *
   * Los dos casos usan la MISMA ventana: lo único que cambia es la unidad.
   */
  test('con la unidad correcta la ventana vive; con segundos, muere', () => {
    const window = { utilization: 0.5, resets_at: NOW_S + 3600 }
    expect(isFreshWindow(window, NOW_MS)).toBe(true)
    expect(isFreshWindow(window, NOW_S)).toBe(false)
  })
})

describe('filterFreshWindows — el filtro compuesto sobre las cuatro ventanas', () => {
  test('la ventana fresca sobrevive', () => {
    const fresh = { utilization: 0.5, resets_at: NOW_S + 3600 }
    expect(filterFreshWindows({ five_hour: fresh }, NOW_MS)).toEqual({ five_hour: fresh })
  })

  test('la vencida se descarta', () => {
    expect(filterFreshWindows(
      { five_hour: { utilization: 0.5, resets_at: NOW_S - 1 } }, NOW_MS,
    )).toEqual({})
  })

  test('el filtro compone con el validador: NaN no sobrevive', () => {
    expect(filterFreshWindows(
      { five_hour: { utilization: Number('x'), resets_at: NOW_S + 10 } }, NOW_MS,
    )).toEqual({})
  })

  test('y la ventana a medias tampoco, aunque su reposición sea fresca', () => {
    expect(filterFreshWindows(
      { five_hour: { surpassedThreshold: 0.9, resets_at: NOW_S + 10 } }, NOW_MS,
    )).toEqual({})
  })
})

describe('composeRateLimitsPayload — la escala y la puerta de gateway', () => {
  const reset = NOW_S + 3600

  test('la fracción 0-1 se publica como porcentaje 0-100', () => {
    const payload = composeRateLimitsPayload(
      { five_hour: { utilization: 0.87, resets_at: reset } },
      { nowMs: NOW_MS, source: 'firstParty' },
    )
    expect(payload).toEqual({ five_hour: { used_percentage: 87, resets_at: reset } })
  })

  /*
   * La cota medida del composer del binario: publica `used_percentage` y
   * `resets_at`, y NADA más. `surpassedThreshold` se extrae, gobierna el
   * estado de cuota, y no llega al payload de statusline.
   */
  test('`surpassedThreshold` NO se propaga al payload', () => {
    const payload = composeRateLimitsPayload(
      { five_hour: { utilization: 0.87, resets_at: reset, surpassedThreshold: 0.8 } },
      { nowMs: NOW_MS, source: 'firstParty' },
    )
    expect(payload.five_hour).toEqual({ used_percentage: 87, resets_at: reset })
  })

  test('`overage` se publica como `spend_limit`, y SOLO bajo gateway', () => {
    const windows = { overage: { utilization: 0.25, resets_at: reset } }
    expect(composeRateLimitsPayload(windows, { nowMs: NOW_MS, source: 'gateway' })).toEqual({
      spend_limit: { used_percentage: 25, resets_at: reset },
    })
    expect(composeRateLimitsPayload(windows, { nowMs: NOW_MS, source: 'firstParty' })).toEqual({})
  })

  // La cota declarada del binario: extrae cuatro ventanas y publica tres.
  test('`seven_day_overage_included` se extrae y NO se publica', () => {
    expect(composeRateLimitsPayload(
      { seven_day_overage_included: { utilization: 0.9, resets_at: reset } },
      { nowMs: NOW_MS, source: 'gateway' },
    )).toEqual({})
  })

  test('el payload aplica el filtro de frescura antes de componer', () => {
    expect(composeRateLimitsPayload(
      { five_hour: { utilization: 0.87, resets_at: NOW_S - 1 } },
      { nowMs: NOW_MS, source: 'firstParty' },
    )).toEqual({})
  })
})

describe('FIDELIDAD — el recipe del propio cliente lee nuestro payload', () => {
  const corpus = readFileSync(CORPUS, 'utf8')

  /** El recipe tal cual lo publica el cliente, sin el bullet de su documentación. */
  function statuslineRecipe(): string {
    for (const line of corpus.split('\n')) {
      if (line.includes('rate_limits.five_hour.used_percentage') && line.includes('pct=')) {
        return line.replace(/^\s*-\s*/, '')
      }
    }
    throw new Error('el recipe no está en el corpus')
  }

  /**
   * El recipe se ejecuta y se lee su salida Y su codigo.
   *
   * El codigo no es ruido: el recipe cierra con `[ -n "$pct" ] && printf`, asi
   * que salir 1 ES su forma de declarar «no hay cifra que publicar». Un
   * envoltorio que tratara ese 1 como error no podria distinguir «el medidor
   * calla» de «el recipe se rompio», que es justo lo que las anulaciones de
   * abajo tienen que separar.
   */
  function runRecipe(recipe: string, payload: unknown): { out: string; code: number } {
    const done = spawnSync('bash', ['-c', recipe], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    })
    return { out: done.stdout.trim(), code: done.status ?? -1 }
  }

  const nowMs = Date.now()
  const nowSeconds = Math.floor(nowMs / 1000)
  const windows = { five_hour: { utilization: 0.87, resets_at: nowSeconds + 3 * 3600 } }

  test('el recipe se extrae del corpus, no se transcribe', () => {
    expect(statuslineRecipe()).toStartWith('input=$(cat)')
  })

  test('el recipe resuelve la CIFRA DE CUOTA de nuestro payload', () => {
    const payload = {
      rate_limits: composeRateLimitsPayload(windows, { nowMs, source: 'firstParty' }),
    }
    expect(runRecipe(statuslineRecipe(), payload)).toEqual({ out: '5h: 87%', code: 0 })
  })

  test('y el TIEMPO DE RESET es consultable por la misma vía', () => {
    const payload = {
      rate_limits: composeRateLimitsPayload(windows, { nowMs, source: 'firstParty' }),
    }
    const reset = runRecipe(
      "cat | jq -r '.rate_limits.five_hour.resets_at // empty'", payload,
    )
    expect(Number(reset.out)).toBe(nowSeconds + 3 * 3600)
  })

  // ANULACIÓN: sin la escala, el payload lleva la forma de la CABECERA. El
  // recipe calla. Discrimina «el recipe lee el campo compuesto» de «cualquier
  // número imprime», que es lo que un caso sin esta mitad no separaría.
  test('anulada la composición, el recipe del cliente no resuelve nada', () => {
    expect(runRecipe(statuslineRecipe(), { rate_limits: windows }))
      .toEqual({ out: '', code: 1 })
  })

  test('y sin la clave `rate_limits`, tampoco', () => {
    expect(runRecipe(statuslineRecipe(), { model: { display_name: 'x' } }))
      .toEqual({ out: '', code: 1 })
  })
})

describe('currentLimits — el estado que dos consumidores ya declaraban', () => {
  /*
   * `command-runtime/src/internal/pendingCrossPackageDeps.ts` declara
   * `requireProviderClaudeAiLimits(): { currentLimits: { isUsingOverage: boolean } }`
   * y lo resuelve con `require('@thyrox/provider/claudeAiLimits.js')`. Mientras
   * el módulo no existía, ese require fallaba AL LLAMARSE, que es ruidoso.
   *
   * Un porte que trajera sólo el medidor haría resolver el require y dejaría
   * `currentLimits` en `undefined`: el fallo pasaría de ruidoso a silencioso,
   * que es peor. Por eso el estado entra en el mismo pase.
   */
  test('el estado inicial es el de la fuente', () => {
    resetCurrentLimits()
    expect(readCurrentLimits()).toEqual({
      status: 'allowed',
      unifiedRateLimitFallbackAvailable: false,
      isUsingOverage: false,
    })
  })

  test('satisface la forma que el consumidor declara', () => {
    resetCurrentLimits()
    expect(typeof readCurrentLimits().isUsingOverage).toBe('boolean')
  })

  test('el binding exportado sigue al estado, no a una copia', () => {
    resetCurrentLimits()
    emitStatusChange({
      status: 'allowed_warning',
      unifiedRateLimitFallbackAvailable: true,
      isUsingOverage: true,
    })
    expect(currentLimits.status).toBe('allowed_warning')
    expect(currentLimits.isUsingOverage).toBe(true)
    resetCurrentLimits()
  })

  test('cada oyente recibe el cambio', () => {
    resetCurrentLimits()
    const seen: string[] = []
    const listener = (l: { status: string }) => seen.push(l.status)
    statusListeners.add(listener)
    emitStatusChange({ status: 'rejected', unifiedRateLimitFallbackAvailable: false })
    statusListeners.delete(listener)
    expect(seen).toEqual(['rejected'])
    resetCurrentLimits()
  })

  test('un oyente retirado ya no lo recibe', () => {
    resetCurrentLimits()
    const seen: string[] = []
    const listener = (l: { status: string }) => seen.push(l.status)
    statusListeners.add(listener)
    statusListeners.delete(listener)
    emitStatusChange({ status: 'rejected', unifiedRateLimitFallbackAvailable: false })
    expect(seen).toEqual([])
    resetCurrentLimits()
  })
})

describe('el bloqueo declarado por command-runtime, cerrado por conducta', () => {
  /*
   * No basta con que el módulo exista: el consumidor lo alcanza por el mapa
   * `exports` del paquete (`./*.js`), no por ruta relativa. Este caso ejerce
   * ESE camino, que es el único que el consumidor usa.
   */
  test('requireProviderClaudeAiLimits resuelve la forma que declara', async () => {
    const { requireProviderClaudeAiLimits } = await import(
      '../../command-runtime/src/internal/pendingCrossPackageDeps'
    )
    const resolved = requireProviderClaudeAiLimits()
    expect(resolved.currentLimits).toBeDefined()
    expect(typeof resolved.currentLimits.isUsingOverage).toBe('boolean')
  })
})
