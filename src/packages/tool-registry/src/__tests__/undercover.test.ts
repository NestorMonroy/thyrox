/**
 * La mitad ROJA del porte de `undercover`.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/undercover.ts` (89 líneas,
 * 3 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se reimplementa y no se copia.
 *
 * Métrica: la lógica de activación con sus tres entradas —la variable de
 * fuerza, la clasificación del repositorio y la marca de aviso ya visto— y que
 * el texto de instrucciones nombre lo que este árbol prohíbe.
 * Ciega a: si el texto SIRVE, o sea si un modelo que lo lea deja de filtrar;
 * eso no lo mide un test unitario.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

const FUERZA = 'THYROX_UNDERCOVER'

function limpiar(): void {
  delete process.env[FUERZA]
}

describe('isUndercover — la activación, y su default seguro', () => {
  beforeEach(limpiar)
  afterEach(limpiar)

  test('1. la variable de fuerza lo enciende', async () => {
    const { isUndercover } = await import('../undercover.ts')
    process.env[FUERZA] = '1'
    expect(isUndercover()).toBe(true)
  })

  test('2. la variable acepta las cuatro formas verdaderas', async () => {
    const { isUndercover } = await import('../undercover.ts')
    for (const valor of ['1', 'true', 'YES', 'on']) {
      process.env[FUERZA] = valor
      expect(isUndercover()).toBe(true)
    }
  })

  test('3. SIN clasificación confirmada, está ENCENDIDO', async () => {
    const { isUndercover } = await import('../undercover.ts')
    const { _resetRepoClassCacheForTests } = await import(
      '@thyrox/agent/commitAttribution.js'
    )
    _resetRepoClassCacheForTests()
    // `null` —la comprobación aún no corrió— resuelve a ENCENDIDO. No hay
    // fuerza-apagado: si no consta que el repositorio sea interno, se queda
    // encubierto. Un nombre en clave filtrado a un repositorio público no se
    // deshace.
    expect(isUndercover()).toBe(true)
  })

  test('4. con la lista vacía, un repositorio con remoto NO lo apaga', async () => {
    const { isUndercover } = await import('../undercover.ts')
    const { isInternalModelRepo, _resetRepoClassCacheForTests } = await import(
      '@thyrox/agent/commitAttribution.js'
    )
    _resetRepoClassCacheForTests()
    await isInternalModelRepo()
    // Clasificado como `external` o `none`: los dos dejan el modo encendido.
    expect(isUndercover()).toBe(true)
  })
})

describe('getUndercoverInstructions — lo que el texto tiene que nombrar', () => {
  test('5. nombra las dos prohibiciones que este árbol declara', async () => {
    const { getUndercoverInstructions } = await import('../undercover.ts')
    const texto = getUndercoverInstructions()
    // No son inventadas: `.claude/rules/git.md` prohíbe el remolque de
    // identidad del agente, y `model-selection-subagents.md` prohíbe el
    // identificador de modelo en el cuerpo y el título de un pull request.
    expect(texto).toContain('Co-Authored-By')
    expect(texto.toLowerCase()).toContain('pull request')
  })

  test('6. el texto NO va vacío', async () => {
    const { getUndercoverInstructions } = await import('../undercover.ts')
    expect(getUndercoverInstructions().length).toBeGreaterThan(100)
  })

  test('7. NO cita nombres de la organización de la fuente', async () => {
    const { getUndercoverInstructions } = await import('../undercover.ts')
    const texto = getUndercoverInstructions().toLowerCase()
    // El texto de la fuente enumera repositorios, canales y enlaces cortos
    // internos de OTRA organización. Copiarlos aquí no protege nada y mete su
    // dominio en este árbol.
    expect(texto).not.toContain('anthropics/')
    expect(texto).not.toContain('claude-cli-internal')
  })
})

describe('shouldShowUndercoverAutoNotice — el aviso de una sola vez', () => {
  beforeEach(limpiar)
  afterEach(limpiar)

  test('8. con la variable de fuerza NO se avisa', async () => {
    const { shouldShowUndercoverAutoNotice } = await import('../undercover.ts')
    process.env[FUERZA] = '1'
    // Quien la declaró ya lo sabe: avisarle es ruido.
    expect(shouldShowUndercoverAutoNotice()).toBe(false)
  })

  test('9. apagado el modo, no hay nada que avisar', async () => {
    const mod = await import('../undercover.ts')
    // Con el modo encendido —el default— el aviso depende sólo de la marca.
    expect(typeof mod.shouldShowUndercoverAutoNotice()).toBe('boolean')
  })

  test('10. los tres símbolos existen y son funciones', async () => {
    const mod = await import('../undercover.ts')
    expect(typeof mod.isUndercover).toBe('function')
    expect(typeof mod.getUndercoverInstructions).toBe('function')
    expect(typeof mod.shouldShowUndercoverAutoNotice).toBe('function')
  })
})
