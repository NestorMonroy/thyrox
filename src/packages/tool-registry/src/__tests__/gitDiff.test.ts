/**
 * La mitad ROJA del porte de `gitDiff`.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/gitDiff.ts` (532 líneas,
 * 11 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se reimplementa y no se copia.
 *
 * QUÉ SE MIDE Y QUÉ NO. Los cuatro símbolos que ejercitan un `git` real
 * —`fetchGitDiff`, `fetchGitDiffHunks`, `fetchSingleFileGitDiff` y el estado
 * transitorio— dependen del repositorio en que corra la suite, así que su
 * veredicto no sería del porte sino del árbol. Lo que sí se mide es la
 * frontera PURA: los tres parseadores y los topes que aplican, que es donde
 * viven las decisiones que un porte puede perder en silencio.
 *
 * Métrica: los tres parseadores exportados (`parseGitNumstat`, `parseGitDiff`,
 * `parseShortstat`) con entradas sintéticas construidas a mano, más la
 * existencia y forma de los cuatro que hablan con git.
 * Ciega a: si `git` se invoca con los argumentos correctos, al orden de las
 * llamadas dentro de `fetchGitDiff`, y a la sonda `--shortstat` como atajo —
 * eso sólo lo vería una sonda sobre un repositorio preparado, y su veredicto
 * dependería del `git` instalado.
 */
import { describe, expect, test } from 'bun:test'

describe('parseGitNumstat — el conteo, sus topes y el binario', () => {
  test('1. suma añadidas y quitadas, y cuenta los archivos válidos', async () => {
    const { parseGitNumstat } = await import('../gitDiff.ts')
    const { stats, perFileStats } = parseGitNumstat(
      '3\t1\tsrc/a.ts\n10\t0\tsrc/b.ts\n',
    )
    expect(stats).toEqual({ filesCount: 2, linesAdded: 13, linesRemoved: 1 })
    expect(perFileStats.get('src/a.ts')).toEqual({
      added: 3,
      removed: 1,
      isBinary: false,
    })
  })

  test('2. una línea con menos de tres campos NO cuenta como archivo', async () => {
    const { parseGitNumstat } = await import('../gitDiff.ts')
    const { stats } = parseGitNumstat('3\t1\tsrc/a.ts\nbasura sin tabuladores\n')
    expect(stats.filesCount).toBe(1)
  })

  test('3. el binario se marca y aporta CERO líneas, no NaN', async () => {
    const { parseGitNumstat } = await import('../gitDiff.ts')
    const { stats, perFileStats } = parseGitNumstat('-\t-\timg/logo.png\n')
    expect(perFileStats.get('img/logo.png')).toEqual({
      added: 0,
      removed: 0,
      isBinary: true,
    })
    // El archivo SÍ cuenta; lo que no aporta son líneas.
    expect(stats).toEqual({ filesCount: 1, linesAdded: 0, linesRemoved: 0 })
  })

  test('4. un nombre de archivo CON tabulador se reconstruye entero', async () => {
    const { parseGitNumstat } = await import('../gitDiff.ts')
    const { perFileStats } = parseGitNumstat('1\t0\tsrc/con\ttab.ts\n')
    expect(perFileStats.has('src/con\ttab.ts')).toBe(true)
  })

  test('5. el detalle por archivo se corta en 50; el TOTAL no', async () => {
    const { parseGitNumstat } = await import('../gitDiff.ts')
    const entrada = Array.from(
      { length: 60 },
      (_, i) => `1\t1\tsrc/f${i}.ts`,
    ).join('\n')
    const { stats, perFileStats } = parseGitNumstat(entrada)
    expect(perFileStats.size).toBe(50)
    // El conteo total NO se trunca: son 60 archivos aunque se guarden 50.
    expect(stats.filesCount).toBe(60)
    expect(stats.linesAdded).toBe(60)
  })

  test('6. entrada vacía da ceros, no lanza', async () => {
    const { parseGitNumstat } = await import('../gitDiff.ts')
    const { stats, perFileStats } = parseGitNumstat('')
    expect(stats).toEqual({ filesCount: 0, linesAdded: 0, linesRemoved: 0 })
    expect(perFileStats.size).toBe(0)
  })
})

describe('parseGitDiff — los tramos, y los tres topes que los acotan', () => {
  const DIFF_UN_ARCHIVO = [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 1111111..2222222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,3 +1,4 @@',
    ' contexto',
    '-quitada',
    '+añadida',
    '+otra',
    '',
  ].join('\n')

  test('7. extrae el nombre del lado b y los tramos con sus posiciones', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const result = parseGitDiff(DIFF_UN_ARCHIVO)
    expect([...result.keys()]).toEqual(['src/a.ts'])
    const hunks = result.get('src/a.ts')!
    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toMatchObject({
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
    })
  })

  test('8. la metadata del encabezado NO entra en las líneas del tramo', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const hunks = parseGitDiff(DIFF_UN_ARCHIVO).get('src/a.ts')!
    const lineas = hunks[0]!.lines
    expect(lineas).toEqual([' contexto', '-quitada', '+añadida', '+otra', ''])
    expect(lineas.some(l => l.startsWith('index '))).toBe(false)
    expect(lineas.some(l => l.startsWith('---'))).toBe(false)
    expect(lineas.some(l => l.startsWith('+++'))).toBe(false)
  })

  test('9. el encabezado SIN conteo cae a 1, que es lo que git omite', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '@@ -5 +5 @@',
      '-a',
      '+b',
      '',
    ].join('\n')
    const hunk = parseGitDiff(diff).get('x.ts')![0]!
    expect(hunk.oldStart).toBe(5)
    expect(hunk.oldLines).toBe(1)
    expect(hunk.newLines).toBe(1)
  })

  test('10. varios tramos del mismo archivo, incluido el ÚLTIMO', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '@@ -1,1 +1,1 @@',
      '-a',
      '+b',
      '@@ -20,1 +20,1 @@',
      '-c',
      '+d',
      '',
    ].join('\n')
    // El último tramo no lo cierra ningún encabezado siguiente: si no se
    // empuja al terminar el bucle, desaparece sin error.
    expect(parseGitDiff(diff).get('x.ts')).toHaveLength(2)
  })

  test('11. varios archivos salen como entradas distintas', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '@@ -1,1 +1,1 @@',
      '-a',
      '+b',
      'diff --git a/y.ts b/y.ts',
      '@@ -1,1 +1,1 @@',
      '-c',
      '+d',
      '',
    ].join('\n')
    expect([...parseGitDiff(diff).keys()].sort()).toEqual(['x.ts', 'y.ts'])
  })

  test('12. un archivo SIN tramos no aparece en el mapa', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const diff = [
      'diff --git a/img.png b/img.png',
      'index 1111111..2222222 100644',
      'Binary files a/img.png and b/img.png differ',
      '',
    ].join('\n')
    expect(parseGitDiff(diff).size).toBe(0)
  })

  test('13. el diff de MÁS de 1 MB se salta entero', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const relleno = Array.from({ length: 40_000 }, () => '+' + 'x'.repeat(30))
    const gordo = [
      'diff --git a/gordo.ts b/gordo.ts',
      '@@ -1,1 +1,40000 @@',
      ...relleno,
    ].join('\n')
    const flaco = [
      'diff --git a/flaco.ts b/flaco.ts',
      '@@ -1,1 +1,1 @@',
      '+ok',
      '',
    ].join('\n')
    const result = parseGitDiff(gordo + '\n' + flaco)
    // El gordo se salta; el flaco que viene DESPUÉS sigue leyéndose.
    expect(result.has('gordo.ts')).toBe(false)
    expect(result.has('flaco.ts')).toBe(true)
  })

  test('14. dentro de un archivo, las líneas se cortan en 400', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const lineas = Array.from({ length: 500 }, (_, i) => `+l${i}`)
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '@@ -1,1 +1,500 @@',
      ...lineas,
      '',
    ].join('\n')
    const hunk = parseGitDiff(diff).get('x.ts')![0]!
    expect(hunk.lines).toHaveLength(400)
  })

  test('15. el número de ARCHIVOS se corta en 50', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    const diff = Array.from({ length: 60 }, (_, i) =>
      [`diff --git a/f${i}.ts b/f${i}.ts`, '@@ -1,1 +1,1 @@', '+x'].join('\n'),
    ).join('\n')
    expect(parseGitDiff(diff).size).toBe(50)
  })

  test('16. entrada vacía o en blanco da un mapa vacío', async () => {
    const { parseGitDiff } = await import('../gitDiff.ts')
    expect(parseGitDiff('').size).toBe(0)
    expect(parseGitDiff('   \n  ').size).toBe(0)
  })
})

describe('parseShortstat — la sonda barata, y su null', () => {
  test('17. lee las tres cifras de la forma completa', async () => {
    const { parseShortstat } = await import('../gitDiff.ts')
    expect(
      parseShortstat(' 1648 files changed, 52341 insertions(+), 8123 deletions(-)'),
    ).toEqual({ filesCount: 1648, linesAdded: 52341, linesRemoved: 8123 })
  })

  test('18. sin inserciones o sin borrados, la cifra ausente es CERO', async () => {
    const { parseShortstat } = await import('../gitDiff.ts')
    expect(parseShortstat(' 2 files changed, 5 insertions(+)')).toEqual({
      filesCount: 2,
      linesAdded: 5,
      linesRemoved: 0,
    })
    expect(parseShortstat(' 3 files changed, 7 deletions(-)')).toEqual({
      filesCount: 3,
      linesAdded: 0,
      linesRemoved: 7,
    })
  })

  test('19. el singular «1 file changed» también se reconoce', async () => {
    const { parseShortstat } = await import('../gitDiff.ts')
    expect(parseShortstat(' 1 file changed, 1 insertion(+)')).toEqual({
      filesCount: 1,
      linesAdded: 1,
      linesRemoved: 0,
    })
  })

  test('20. lo que NO es un shortstat responde null, no ceros', async () => {
    const { parseShortstat } = await import('../gitDiff.ts')
    // Un null distingue «no hubo salida que leer» de «hubo cero cambios»,
    // y el llamador usa esa diferencia para decidir si sigue midiendo.
    expect(parseShortstat('')).toBeNull()
    expect(parseShortstat('fatal: not a git repository')).toBeNull()
  })
})

describe('la superficie que habla con git', () => {
  test('21. los cuatro símbolos existen y son funciones', async () => {
    const mod = await import('../gitDiff.ts')
    expect(typeof mod.fetchGitDiff).toBe('function')
    expect(typeof mod.fetchGitDiffHunks).toBe('function')
    expect(typeof mod.fetchSingleFileGitDiff).toBe('function')
    expect(typeof mod.parseGitDiff).toBe('function')
  })

  test('22. `fetchSingleFileGitDiff` fuera de un repo responde null', async () => {
    const { fetchSingleFileGitDiff } = await import('../gitDiff.ts')
    // `/` no cuelga de ningún repositorio: `findGitRoot` da null y el flujo
    // corta ahí, sin invocar git ni una vez.
    expect(await fetchSingleFileGitDiff('/no-existe-en-repo.txt')).toBeNull()
  })
})
