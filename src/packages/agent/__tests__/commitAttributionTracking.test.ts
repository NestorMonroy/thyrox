/**
 * La mitad ROJA del cierre del porte de `commitAttribution`.
 *
 * Procedencia: `ccnmt: packages/agent/commitAttribution.ts` (963 líneas,
 * 30 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se reimplementa y no se copia.
 *
 * El porte previo trajo 9 de los 30 y DECLARÓ su recorte, nombrando tres
 * paquetes hermanos ausentes. Los tres están hoy. Éste es el control de los
 * 21 que faltaban.
 *
 * Métrica: los símbolos puros —clasificación del repositorio, normalización de
 * ruta, y el álgebra de seguimiento de contribución— con estado construido a
 * mano.
 * Ciega a: los cinco que ejercitan un `git` real (`getGitDiffSize`,
 * `isFileDeleted`, `getStagedFiles`, `isGitTransientState`,
 * `calculateCommitAttribution`): su veredicto sería del repositorio en que
 * corra la suite, no del porte.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('la clasificación del repositorio', () => {
  test('1. `getRepoClassCached` responde null antes de la comprobación', async () => {
    const { getRepoClassCached } = await import('../commitAttribution.ts')
    expect(getRepoClassCached()).toBeNull()
  })

  test('2. `isInternalModelRepoCached` responde false sin comprobar', async () => {
    const { isInternalModelRepoCached } = await import('../commitAttribution.ts')
    // El default seguro es NO filtrar: un `true` prematuro dejaría salir un
    // nombre interno a un remolque de commit público.
    expect(isInternalModelRepoCached()).toBe(false)
  })

  test('3. con la lista de permitidos VACÍA, ningún remoto es interno', async () => {
    const { isInternalModelRepo, getRepoClassCached } = await import(
      '../commitAttribution.ts'
    )
    expect(await isInternalModelRepo()).toBe(false)
    // Y el cacheo queda asignado: ya no es null.
    expect(getRepoClassCached()).not.toBeNull()
  })

  test('4. `getAttributionRepoRoot` da la raíz de git del cwd', async () => {
    const { getAttributionRepoRoot } = await import('../commitAttribution.ts')
    const raiz = getAttributionRepoRoot()
    expect(typeof raiz).toBe('string')
    expect(raiz.length).toBeGreaterThan(0)
  })
})

describe('la superficie y las rutas', () => {
  test('5. `getClientSurface` cae a `cli` sin variable declarada', async () => {
    const { getClientSurface } = await import('../commitAttribution.ts')
    const previo = process.env.CLAUDE_CODE_ENTRYPOINT
    delete process.env.CLAUDE_CODE_ENTRYPOINT
    expect(getClientSurface()).toBe('cli')
    process.env.CLAUDE_CODE_ENTRYPOINT = 'sdk'
    expect(getClientSurface()).toBe('sdk')
    if (previo === undefined) delete process.env.CLAUDE_CODE_ENTRYPOINT
    else process.env.CLAUDE_CODE_ENTRYPOINT = previo
  })

  test('6. una ruta RELATIVA pasa verbatim', async () => {
    const { normalizeFilePath } = await import('../commitAttribution.ts')
    expect(normalizeFilePath('src/a.ts')).toBe('src/a.ts')
  })

  test('7. una ruta absoluta FUERA de la raíz vuelve absoluta', async () => {
    const { normalizeFilePath } = await import('../commitAttribution.ts')
    // Sin este camino, un archivo de otro árbol se indexaría con una ruta
    // relativa llena de `..` que no casa con ninguna salida de git.
    expect(normalizeFilePath('/no/existe/fuera.txt')).toBe('/no/existe/fuera.txt')
  })

  test('8. `expandFilePath` deja lo absoluto y ancla lo relativo', async () => {
    const { expandFilePath, getAttributionRepoRoot } = await import(
      '../commitAttribution.ts'
    )
    expect(expandFilePath('/ya/absoluto')).toBe('/ya/absoluto')
    expect(expandFilePath('x.ts')).toBe(join(getAttributionRepoRoot(), 'x.ts'))
  })
})

describe('el álgebra de la contribución', () => {
  test('9. un archivo NUEVO aporta la longitud entera del contenido', async () => {
    const { createEmptyAttributionState, trackFileCreation } = await import(
      '../commitAttribution.ts'
    )
    const estado = trackFileCreation(
      createEmptyAttributionState(),
      'nuevo.txt',
      'hola',
    )
    expect(estado.fileStates.get('nuevo.txt')?.claudeContribution).toBe(4)
  })

  test('10. una SUSTITUCIÓN de la misma longitud NO da cero', async () => {
    const { createEmptyAttributionState, trackFileModification } = await import(
      '../commitAttribution.ts'
    )
    // Es la razón de ser del prefijo/sufijo común: `Math.abs(nuevo - viejo)`
    // daría 0 aquí, y la contribución desaparecería sin error.
    const estado = trackFileModification(
      createEmptyAttributionState(),
      'a.txt',
      'presiona Esc para salir',
      'presiona esc para salir',
      false,
    )
    expect(estado.fileStates.get('a.txt')?.claudeContribution).toBe(1)
  })

  test('11. el tramo cambiado se mide, no el archivo entero', async () => {
    const { createEmptyAttributionState, trackFileModification } = await import(
      '../commitAttribution.ts'
    )
    const estado = trackFileModification(
      createEmptyAttributionState(),
      'a.txt',
      'inicioMEDIOfinal',
      'inicioOTROTRAMOfinal',
      false,
    )
    // El prefijo `inicio` y el sufijo `final` son comunes: se mide el mayor
    // de los dos tramos que cambian.
    expect(estado.fileStates.get('a.txt')?.claudeContribution).toBe(10)
  })

  test('12. las contribuciones se ACUMULAN sobre el mismo archivo', async () => {
    const { createEmptyAttributionState, trackFileModification } = await import(
      '../commitAttribution.ts'
    )
    let estado = trackFileModification(
      createEmptyAttributionState(),
      'a.txt',
      '',
      'abc',
      false,
    )
    estado = trackFileModification(estado, 'a.txt', 'abc', 'abcdef', false)
    expect(estado.fileStates.get('a.txt')?.claudeContribution).toBe(6)
  })

  test('13. una eliminación aporta la longitud del contenido borrado', async () => {
    const { createEmptyAttributionState, trackFileDeletion } = await import(
      '../commitAttribution.ts'
    )
    const estado = trackFileDeletion(
      createEmptyAttributionState(),
      'viejo.txt',
      '12345',
    )
    const fila = estado.fileStates.get('viejo.txt')!
    expect(fila.claudeContribution).toBe(5)
    // Un hash vacío es la marca de «ya no existe»: distinguirlo del hash de
    // una cadena vacía es lo que evita reatribuirlo como archivo presente.
    expect(fila.contentHash).toBe('')
  })

  test('14. el estado recibido NO se muta', async () => {
    const { createEmptyAttributionState, trackFileModification } = await import(
      '../commitAttribution.ts'
    )
    const inicial = createEmptyAttributionState()
    const siguiente = trackFileModification(inicial, 'a.txt', '', 'x', false)
    expect(inicial.fileStates.size).toBe(0)
    expect(siguiente.fileStates.size).toBe(1)
  })

  test('15. `trackBulkFileChanges` aplica los tres tipos en un solo pase', async () => {
    const { createEmptyAttributionState, trackBulkFileChanges } = await import(
      '../commitAttribution.ts'
    )
    const estado = trackBulkFileChanges(createEmptyAttributionState(), [
      { path: 'nuevo.txt', type: 'created', oldContent: '', newContent: 'abcd' },
      { path: 'mod.txt', type: 'modified', oldContent: 'aXc', newContent: 'aYc' },
      { path: 'ido.txt', type: 'deleted', oldContent: '123', newContent: '' },
    ])
    expect(estado.fileStates.get('nuevo.txt')?.claudeContribution).toBe(4)
    expect(estado.fileStates.get('mod.txt')?.claudeContribution).toBe(1)
    expect(estado.fileStates.get('ido.txt')?.claudeContribution).toBe(3)
    expect(estado.fileStates.get('ido.txt')?.contentHash).toBe('')
  })

  test('16. el bulk ACUMULA sobre el mismo archivo dentro del mismo pase', async () => {
    const { createEmptyAttributionState, trackBulkFileChanges } = await import(
      '../commitAttribution.ts'
    )
    // Una sola copia del Map que se muta: si se copiara por archivo el coste
    // sería cuadrático con cientos de miles de archivos, y además la segunda
    // entrada no vería la primera.
    const estado = trackBulkFileChanges(createEmptyAttributionState(), [
      { path: 'a.txt', type: 'created', oldContent: '', newContent: 'abc' },
      { path: 'a.txt', type: 'modified', oldContent: 'abc', newContent: 'abcdef' },
    ])
    expect(estado.fileStates.get('a.txt')?.claudeContribution).toBe(6)
  })
})

describe('el estado completo y la restauración', () => {
  test('17. `createEmptyAttributionState` trae los DOS campos que faltaban', async () => {
    const { createEmptyAttributionState } = await import(
      '../commitAttribution.ts'
    )
    const estado = createEmptyAttributionState()
    expect(estado.sessionBaselines).toBeInstanceOf(Map)
    expect(estado.startingHeadSha).toBeNull()
  })

  test('18. `attributionRestoreStateFromLog` entrega el estado por callback', async () => {
    const { attributionRestoreStateFromLog } = await import(
      '../commitAttribution.ts'
    )
    let recibido: unknown = null
    attributionRestoreStateFromLog([], s => {
      recibido = s
    })
    expect(recibido).not.toBeNull()
    expect((recibido as { promptCount: number }).promptCount).toBe(0)
  })

  test('19. `getFileMtime` de un archivo real da su mtime', async () => {
    const { getFileMtime } = await import('../commitAttribution.ts')
    const dir = mkdtempSync(join(tmpdir(), 'attr-'))
    const archivo = join(dir, 'x.txt')
    writeFileSync(archivo, 'contenido')
    const mtime = await getFileMtime(archivo)
    expect(mtime).toBeGreaterThan(0)
  })

  test('20. `getFileMtime` de un archivo AUSENTE cae al ahora', async () => {
    const { getFileMtime } = await import('../commitAttribution.ts')
    const antes = Date.now()
    const mtime = await getFileMtime('/no/existe/jamas.txt')
    // Caer al ahora, y no lanzar: un archivo que el seguimiento aún no ve no
    // debe abortar la atribución de todo el commit.
    expect(mtime).toBeGreaterThanOrEqual(antes)
  })
})

describe('los cinco que hablan con git existen y tienen su forma', () => {
  test('21. los cinco son funciones', async () => {
    const mod = await import('../commitAttribution.ts')
    expect(typeof mod.getGitDiffSize).toBe('function')
    expect(typeof mod.isFileDeleted).toBe('function')
    expect(typeof mod.getStagedFiles).toBe('function')
    expect(typeof mod.isGitTransientState).toBe('function')
    expect(typeof mod.calculateCommitAttribution).toBe('function')
  })
})
