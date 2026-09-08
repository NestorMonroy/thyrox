/**
 * La mitad ROJA del porte de `embeddedRgExtractor`.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/embeddedRgExtractor.ts`
 * (83 líneas, 1 símbolo exportado). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se reimplementa y no se copia.
 *
 * Métrica: las tres guardas de salida temprana —plataforma, modo empaquetado y
 * ruta embebida ausente— y la memoización del resultado.
 * Ciega a: la extracción REAL del binario, que exige correr empaquetado en
 * Linux con la ruta embebida presente. Ninguna de las dos condiciones se puede
 * fabricar sin sustituir `fs`, y `mock.module` en bun 1.3.11 no se puede
 * deshacer ni se queda en su archivo (medido al portar `pdf.ts`).
 */
import { describe, expect, test } from 'bun:test'

describe('ensureExtractedRipgrepForSandbox — las guardas de salida', () => {
  test('1. el símbolo existe y es una función', async () => {
    const mod = await import('../embeddedRgExtractor.ts')
    expect(typeof mod.ensureExtractedRipgrepForSandbox).toBe('function')
  })

  test('2. fuera de Linux responde null SIN mirar nada más', async () => {
    const { ensureExtractedRipgrepForSandbox } = await import(
      '../embeddedRgExtractor.ts'
    )
    // La caja de arena de macOS usa primitivas de glob nativas y Windows no
    // la soporta: en ninguna de las dos hace falta un rg en disco.
    if (process.platform !== 'linux') {
      expect(ensureExtractedRipgrepForSandbox()).toBeNull()
      return
    }
    // En Linux la guarda que corta es otra — la mide el caso 3.
    expect(ensureExtractedRipgrepForSandbox()).toBeNull()
  })

  test('3. sin la ruta embebida declarada responde null, no lanza', async () => {
    const { ensureExtractedRipgrepForSandbox } = await import(
      '../embeddedRgExtractor.ts'
    )
    // La suite no corre empaquetada y la global no está asignada: las dos
    // guardas cortan antes de tocar el disco.
    expect(
      (globalThis as { __THYROX_SANDBOX_RG_PATH__?: string })
        .__THYROX_SANDBOX_RG_PATH__,
    ).toBeUndefined()
    expect(ensureExtractedRipgrepForSandbox()).toBeNull()
  })

  test('4. llamarlo dos veces da lo mismo y no lanza', async () => {
    const { ensureExtractedRipgrepForSandbox } = await import(
      '../embeddedRgExtractor.ts'
    )
    const uno = ensureExtractedRipgrepForSandbox()
    const dos = ensureExtractedRipgrepForSandbox()
    expect(dos).toBe(uno)
  })
})
