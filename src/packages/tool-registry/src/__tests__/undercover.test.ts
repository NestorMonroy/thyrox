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
const PERMITIDOS = 'THYROX_INTERNAL_MODEL_REPOS'

function limpiar(): void {
  delete process.env[FUERZA]
  delete process.env[PERMITIDOS]
}

/**
 * Clasifica el repositorio de esta suite como INTERNO, declarando su propio
 * remoto en la lista de permitidos.
 *
 * Sin esto la rama automática ya responde ENCENDIDO por sí sola, y un caso
 * que sólo declarara la variable de fuerza pasaría por la razón equivocada:
 * el sub-patrón D. Medido — con la clasificación sin fijar, retirar la
 * lectura de la variable de fuerza dejaba la suite en verde.
 *
 * LANZA si no lo consigue, y es deliberado. Una versión anterior devolvía
 * `false` y los casos hacían `if (!…) return`: con eso, romper el mecanismo de
 * la lista de permitidos dejaba la suite en VERDE — los casos se saltaban en
 * silencio en vez de fallar. Medido: anulando la comparación contra la lista,
 * 11/0. Es el sub-patrón D metido en la propia precondición del control.
 *
 * Este repositorio tiene remoto, así que la precondición se puede AFIRMAR en
 * vez de esquivar.
 */
async function clasificarComoInterno(): Promise<void> {
  const { getRemoteUrlForDir } = await import('@thyrox/config/gitFilesystem.js')
  const { isInternalModelRepo, getRepoClassCached, _resetRepoClassCacheForTests } =
    await import('@thyrox/agent/commitAttribution.js')
  const { getAttributionRepoRoot } = await import(
    '@thyrox/agent/commitAttribution.js'
  )
  const remoto = await getRemoteUrlForDir(getAttributionRepoRoot())
  if (!remoto) {
    throw new Error(
      'precondición: este repositorio no declara remoto, así que la ' +
        'clasificación no se puede montar. El control no mide nada sin ella.',
    )
  }
  process.env[PERMITIDOS] = remoto
  _resetRepoClassCacheForTests()
  await isInternalModelRepo()
  if (getRepoClassCached() !== 'internal') {
    throw new Error(
      `precondición: con el remoto ${remoto} declarado en ${PERMITIDOS}, la ` +
        `clasificación debería ser 'internal' y es ` +
        `'${getRepoClassCached()}'. El mecanismo de la lista no funciona.`,
    )
  }
}

describe('isUndercover — la activación, y su default seguro', () => {
  beforeEach(limpiar)
  afterEach(limpiar)

  test('1. la variable de fuerza lo enciende SOBRE un repositorio interno', async () => {
    const { isUndercover } = await import('../undercover.ts')
    await clasificarComoInterno()
    // Clasificado interno, la rama automática lo APAGA: sólo la variable de
    // fuerza puede encenderlo. Sin esta precondición el caso no distinguiría
    // la variable del default.
    expect(isUndercover()).toBe(false)
    process.env[FUERZA] = '1'
    expect(isUndercover()).toBe(true)
  })

  test('2. la variable acepta las cuatro formas verdaderas', async () => {
    const { isUndercover } = await import('../undercover.ts')
    await clasificarComoInterno()
    for (const valor of ['1', 'true', 'YES', 'on']) {
      process.env[FUERZA] = valor
      expect(isUndercover()).toBe(true)
    }
    delete process.env[FUERZA]
    expect(isUndercover()).toBe(false)
  })

  test('2-bis. la lista de permitidos APAGA el modo, y es su único camino', async () => {
    const { isUndercover } = await import('../undercover.ts')
    const { _resetRepoClassCacheForTests } = await import(
      '@thyrox/agent/commitAttribution.js'
    )
    await clasificarComoInterno()
    expect(isUndercover()).toBe(false)
    // Retirada la lista, la clasificación vuelve a `external` y el modo se
    // enciende otra vez: es el mecanismo, no un estado pegado.
    delete process.env[PERMITIDOS]
    _resetRepoClassCacheForTests()
    const { isInternalModelRepo } = await import(
      '@thyrox/agent/commitAttribution.js'
    )
    await isInternalModelRepo()
    expect(isUndercover()).toBe(true)
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
