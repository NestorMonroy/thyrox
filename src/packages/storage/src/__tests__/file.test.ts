/**
 * `file.ts` — las operaciones de archivo que el resto del árbol comparte.
 *
 * Procedencia del sujeto: `ccnmt: packages/storage/src/file.ts` (610 líneas,
 * 26 exports). El puerto vigente declara UNO —`atomicWriteFile`— y llama al
 * resto «divergencia de alcance» por dependencias que ya no faltan.
 *
 * Estos casos se agrupan por lo que separan, no por función:
 *
 * - La ESCRITURA tiene dos garantías que se pierden en silencio si se
 *   rompen: el símbolo enlazado sobrevive a la escritura, y los permisos del
 *   archivo destino también. Ninguna de las dos da error al perderse.
 * - El PREFIJO de línea tiene dos formatos y una bandera que elige. Su
 *   inversa vive en el mismo archivo a propósito, y tiene que entender los
 *   dos: si sólo entendiera el vigente, un transcript viejo se leería mal.
 * - La COMPARACIÓN de rutas depende de la plataforma. En este contenedor es
 *   linux, así que la rama de Windows queda declarada como no ejercida.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'file-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('la escritura, y las dos garantías que se pierden en silencio', () => {
  test('1. `writeFileSyncAndFlush` escribe y el contenido queda', async () => {
    const { writeFileSyncAndFlush } = await import('../file.ts')
    const p = join(dir, 'a.txt')
    writeFileSyncAndFlush(p, 'hola', { encoding: 'utf-8' })
    expect(readFileSync(p, 'utf8')).toBe('hola')
  })

  test('2. escribir a través de un SÍMBOLO conserva el símbolo', async () => {
    // Sin resolver el enlace, el rename atómico lo reemplazaría por un
    // archivo regular. Nadie vería un error: el contenido estaría bien y el
    // enlace habría desaparecido.
    const { writeFileSyncAndFlush } = await import('../file.ts')
    const destino = join(dir, 'destino.txt')
    const enlace = join(dir, 'enlace.txt')
    writeFileSync(destino, 'viejo')
    symlinkSync(destino, enlace)
    writeFileSyncAndFlush(enlace, 'nuevo', { encoding: 'utf-8' })
    expect(readFileSync(destino, 'utf8')).toBe('nuevo')
    expect(statSync(enlace).isSymbolicLink?.() ?? false).toBe(false)
    expect(require('fs').lstatSync(enlace).isSymbolicLink()).toBe(true)
  })

  test('3. sobrescribir CONSERVA los permisos del archivo destino', async () => {
    // El rename atómico trae los permisos del temporal, no los del destino.
    // Un archivo a 0600 pasaría a 0644 sin que nadie se entere.
    const { writeFileSyncAndFlush } = await import('../file.ts')
    const p = join(dir, 'secreto.txt')
    writeFileSync(p, 'x')
    chmodSync(p, 0o600)
    writeFileSyncAndFlush(p, 'y', { encoding: 'utf-8' })
    expect(statSync(p).mode & 0o777).toBe(0o600)
  })

  test('4. un archivo NUEVO recibe el modo que se le pide', async () => {
    const { writeFileSyncAndFlush } = await import('../file.ts')
    const p = join(dir, 'nuevo.txt')
    writeFileSyncAndFlush(p, 'x', { encoding: 'utf-8', mode: 0o600 })
    expect(statSync(p).mode & 0o777).toBe(0o600)
  })

  test('5. `atomicWriteFile` no deja el temporal al fallar', async () => {
    const { atomicWriteFile } = await import('../file.ts')
    const { readdirSync } = require('fs')
    // Un destino imposible: el rename falla y el temporal tiene que irse.
    await expect(
      atomicWriteFile(join(dir, 'no-existe', 'x.txt'), 'x'),
    ).rejects.toThrow()
    expect(readdirSync(dir)).toEqual([])
  })

  test('6. `writeTextContent` con CRLF no duplica el retorno', async () => {
    // El texto del modelo ya puede traer CRLF. Unirlo sin normalizar antes
    // produce `\r\r\n`, que ningún editor muestra como salto simple.
    const { writeTextContent } = await import('../file.ts')
    const p = join(dir, 'crlf.txt')
    writeTextContent(p, 'a\r\nb\nc', 'utf-8', 'CRLF')
    expect(readFileSync(p, 'utf8')).toBe('a\r\nb\r\nc')
  })
})

describe('el prefijo de línea, y su inversa', () => {
  test('7. el formato compacto numera con tabulador', async () => {
    const { addLineNumbers } = await import('../file.ts')
    expect(addLineNumbers({ content: 'a\nb', startLine: 1 })).toBe('1\ta\n2\tb')
  })

  test('8. `startLine` desplaza la numeración', async () => {
    const { addLineNumbers } = await import('../file.ts')
    expect(addLineNumbers({ content: 'a\nb', startLine: 10 })).toBe(
      '10\ta\n11\tb',
    )
  })

  test('9. contenido vacío devuelve vacío, no una línea con un 1', async () => {
    const { addLineNumbers } = await import('../file.ts')
    expect(addLineNumbers({ content: '', startLine: 1 })).toBe('')
  })

  test('10. la inversa entiende LOS DOS formatos', async () => {
    // El de flecha es el histórico. Si la inversa sólo entendiera el
    // vigente, un transcript viejo se leería con su prefijo pegado al texto.
    const { stripLineNumberPrefix } = await import('../file.ts')
    expect(stripLineNumberPrefix('42\thola')).toBe('hola')
    expect(stripLineNumberPrefix('    42→hola')).toBe('hola')
    expect(stripLineNumberPrefix('sin prefijo')).toBe('sin prefijo')
  })

  test('11. la bandera elige el formato, y el otro sigue disponible', async () => {
    const { addLineNumbers, isCompactLinePrefixEnabled } = await import(
      '../file.ts'
    )
    const { setGrowthBookConfigOverride, clearGrowthBookConfigOverrides } =
      await import('@thyrox/config/feature-flags')
    clearGrowthBookConfigOverrides()
    expect(isCompactLinePrefixEnabled()).toBe(true)
    // El interruptor de emergencia devuelve el formato de flecha.
    setGrowthBookConfigOverride('tengu_compact_line_prefix_killswitch', true)
    expect(isCompactLinePrefixEnabled()).toBe(false)
    expect(addLineNumbers({ content: 'a', startLine: 1 })).toBe('     1→a')
    // Y la bandera explícita gana sobre el interruptor.
    setGrowthBookConfigOverride('tengu_tab_read_sep', true)
    expect(isCompactLinePrefixEnabled()).toBe(true)
    clearGrowthBookConfigOverrides()
  })

  test('12. a partir de seis dígitos NO se rellena', async () => {
    const { addLineNumbers } = await import('../file.ts')
    const { setGrowthBookConfigOverride, clearGrowthBookConfigOverrides } =
      await import('@thyrox/config/feature-flags')
    setGrowthBookConfigOverride('tengu_compact_line_prefix_killswitch', true)
    expect(addLineNumbers({ content: 'a', startLine: 100000 })).toBe(
      '100000→a',
    )
    expect(addLineNumbers({ content: 'a', startLine: 99999 })).toBe(
      ' 99999→a',
    )
    clearGrowthBookConfigOverrides()
  })
})

describe('lecturas y sondeos que no lanzan', () => {
  test('13. `pathExists` responde por lo que hay y por lo que no', async () => {
    const { pathExists } = await import('../file.ts')
    const p = join(dir, 'x.txt')
    writeFileSync(p, 'x')
    expect(await pathExists(p)).toBe(true)
    expect(await pathExists(join(dir, 'no.txt'))).toBe(false)
  })

  test('14. `readFileSafe` devuelve null en vez de lanzar', async () => {
    const { readFileSafe } = await import('../file.ts')
    const p = join(dir, 'y.txt')
    writeFileSync(p, 'contenido')
    expect(readFileSafe(p)).toBe('contenido')
    expect(readFileSafe(join(dir, 'no.txt'))).toBeNull()
  })

  test('15. la marca de tiempo se trunca a milisegundo entero', async () => {
    // Un vigilante de archivos del editor toca el archivo sin cambiarlo; la
    // precisión de submilisegundo convertiría eso en un falso positivo de
    // «cambió» en cada comparación.
    const { getFileModificationTime, getFileModificationTimeAsync } =
      await import('../file.ts')
    const p = join(dir, 'm.txt')
    writeFileSync(p, 'x')
    const t = getFileModificationTime(p)
    expect(Number.isInteger(t)).toBe(true)
    expect(await getFileModificationTimeAsync(p)).toBe(t)
  })

  test('16. `isDirEmpty` trata el directorio AUSENTE como vacío', async () => {
    // Y un error que no sea de ausencia como NO vacío: equivocarse hacia
    // «vacío» ahí borraría algo que no se pudo leer.
    const { isDirEmpty } = await import('../file.ts')
    const vacio = join(dir, 'vacio')
    mkdirSync(vacio)
    expect(isDirEmpty(vacio)).toBe(true)
    expect(isDirEmpty(join(dir, 'no-existe'))).toBe(true)
    writeFileSync(join(vacio, 'a'), 'x')
    expect(isDirEmpty(vacio)).toBe(false)
  })

  test('17. `findSimilarFile` da el vecino con otra extensión', async () => {
    const { findSimilarFile } = await import('../file.ts')
    writeFileSync(join(dir, 'mod.ts'), 'x')
    expect(findSimilarFile(join(dir, 'mod.js'))).toBe('mod.ts')
    expect(findSimilarFile(join(dir, 'otro.js'))).toBeUndefined()
    expect(findSimilarFile(join(dir, 'no', 'x.js'))).toBeUndefined()
  })

  test('18. `isFileWithinReadSizeLimit` acota, y lo ausente NO pasa', async () => {
    // Un archivo que no se puede consultar responde `false`, no `true`: la
    // duda no autoriza a leerlo entero.
    const { isFileWithinReadSizeLimit, MAX_OUTPUT_SIZE } = await import(
      '../file.ts'
    )
    const p = join(dir, 'g.txt')
    writeFileSync(p, 'x'.repeat(100))
    expect(isFileWithinReadSizeLimit(p, 200)).toBe(true)
    expect(isFileWithinReadSizeLimit(p, 50)).toBe(false)
    expect(isFileWithinReadSizeLimit(join(dir, 'no.txt'))).toBe(false)
    expect(MAX_OUTPUT_SIZE).toBe(0.25 * 1024 * 1024)
  })

  test('19. `detectLineEndings` distingue CRLF de LF, y degrada a LF', async () => {
    const { detectLineEndings } = await import('../file.ts')
    const crlf = join(dir, 'c.txt')
    const lf = join(dir, 'l.txt')
    writeFileSync(crlf, 'a\r\nb\r\n')
    writeFileSync(lf, 'a\nb\n')
    expect(detectLineEndings(crlf)).toBe('CRLF')
    expect(detectLineEndings(lf)).toBe('LF')
    expect(detectLineEndings(join(dir, 'no.txt'))).toBe('LF')
  })
})

describe('rutas: mostrar, comparar y sugerir', () => {
  test('20. `convertLeadingTabsToSpaces` sólo toca los tabuladores INICIALES', async () => {
    const { convertLeadingTabsToSpaces } = await import('../file.ts')
    expect(convertLeadingTabsToSpaces('\t\tx')).toBe('    x')
    expect(convertLeadingTabsToSpaces('x\ty')).toBe('x\ty')
    expect(convertLeadingTabsToSpaces('sin tabs')).toBe('sin tabs')
  })

  test('21. `getDisplayPath` prefiere lo relativo, luego la tilde', async () => {
    const { getDisplayPath } = await import('../file.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const { homedir } = await import('os')
    const relativo = runWithCwdOverride(dir, () =>
      getDisplayPath(join(dir, 'sub', 'a.txt')),
    )
    expect(relativo).toBe(join('sub', 'a.txt'))
    const conTilde = runWithCwdOverride('/', () =>
      getDisplayPath(join(homedir(), 'x.txt')),
    )
    expect(conTilde.startsWith('~')).toBe(true)
  })

  test('22. `pathsEqual` normaliza antes de comparar', async () => {
    const { pathsEqual, normalizePathForComparison } = await import(
      '../file.ts'
    )
    expect(pathsEqual('/a/b/../b/c', '/a/b/c')).toBe(true)
    expect(pathsEqual('/a//b/c', '/a/b/c')).toBe(true)
    expect(pathsEqual('/a/b/c', '/a/b/d')).toBe(false)
    // En linux la comparación es SENSIBLE a mayúsculas — la rama de Windows
    // no se ejerce en este contenedor, y se declara.
    expect(normalizePathForComparison('/A/B')).toBe('/A/B')
  })

  test('23. `suggestPathUnderCwd` encuentra la carpeta de repo que falta', async () => {
    // El patrón real: el modelo arma una ruta absoluta sin el directorio del
    // repositorio. La sugerencia sólo vale si la ruta corregida EXISTE.
    const { suggestPathUnderCwd } = await import('../file.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const { realpathSync } = require('fs')
    const raiz = realpathSync(dir)
    const repo = join(raiz, 'miRepo')
    mkdirSync(join(repo, 'src'), { recursive: true })
    writeFileSync(join(repo, 'src', 'a.ts'), 'x')
    const pedida = join(raiz, 'src', 'a.ts')
    expect(
      await runWithCwdOverride(repo, () => suggestPathUnderCwd(pedida)),
    ).toBe(join(repo, 'src', 'a.ts'))
    // Y no inventa: si bajo el cwd tampoco está, no sugiere nada.
    expect(
      await runWithCwdOverride(repo, () =>
        suggestPathUnderCwd(join(raiz, 'src', 'no-existe.ts')),
      ),
    ).toBeUndefined()
  })

  test('24. lo que ya está bajo el cwd no se sugiere', async () => {
    // Sin esta guarda la función sugeriría la misma ruta que se le dio.
    const { suggestPathUnderCwd } = await import('../file.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const { realpathSync } = require('fs')
    const raiz = realpathSync(dir)
    mkdirSync(join(raiz, 'a'), { recursive: true })
    writeFileSync(join(raiz, 'a', 'x.ts'), 'x')
    expect(
      await runWithCwdOverride(raiz, () =>
        suggestPathUnderCwd(join(raiz, 'a', 'x.ts')),
      ),
    ).toBeUndefined()
  })

  test('25. `getAbsoluteAndRelativePaths` responde por undefined', async () => {
    const { getAbsoluteAndRelativePaths } = await import('../file.ts')
    expect(getAbsoluteAndRelativePaths(undefined)).toEqual({
      absolutePath: undefined,
      relativePath: undefined,
    })
  })

  test('26. `readFileSyncCached` devuelve el contenido, cacheado o no', async () => {
    const { readFileSyncCached } = await import('../file.ts')
    const p = join(dir, 'cache.txt')
    writeFileSync(p, 'uno')
    expect(readFileSyncCached(p)).toBe('uno')
    expect(readFileSyncCached(p)).toBe('uno')
  })

  test('27. `getDesktopPath` devuelve una ruta existente', async () => {
    const { getDesktopPath } = await import('../file.ts')
    const { existsSync } = require('fs')
    expect(existsSync(getDesktopPath())).toBe(true)
  })

  test('28. `FILE_NOT_FOUND_CWD_NOTE` es el literal que la UI reconoce', async () => {
    const { FILE_NOT_FOUND_CWD_NOTE } = await import('../file.ts')
    expect(FILE_NOT_FOUND_CWD_NOTE).toBe(
      'Note: your current working directory is',
    )
  })
})
