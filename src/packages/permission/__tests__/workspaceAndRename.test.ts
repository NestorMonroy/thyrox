/**
 * La mitad ROJA del tramo de DIRECTORIO DE TRABAJO y del nombre de sesión.
 *
 * Procedencia: `ccnmt: packages/permission/src/{filesystem.ts (dos símbolos),
 * commands/add-dir/validation.ts, commands/rename/generateSessionName.ts}`.
 * Ese árbol declara `"license": "UNLICENSED"`, así que los cuerpos se
 * reimplementan y no se copian.
 *
 * POR QUÉ ESTOS TRES JUNTOS. `add-dir/validation.ts` estaba bloqueado por dos
 * funciones de NUESTRO `filesystem.ts` —porte parcial declarado, 13 de 29—
 * que no habían llegado: `allWorkingDirectories` y `pathInWorkingPath`. El
 * bloqueo era propio, no de la fuente, y cerrarlo cuesta menos que
 * registrarlo. `generateSessionName.ts` entra en el mismo pase porque es el
 * otro módulo de `commands/` cuyos ocho especificadores externos resuelven
 * todos, medido uno por uno.
 *
 * Métrica: qué veredicto da cada validación sobre rutas reales del sistema de
 * archivos, y qué devuelve el generador de nombre ante cada forma de
 * respuesta del proveedor.
 * Ciega a: el comportamiento en Windows y macOS — la normalización de
 * `/private/var` y la comparación sin distinguir caja se ejercitan como
 * transformación de cadena, no contra esos sistemas.
 */
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { installPermissionHostBindings } from '../src/host.ts'
import {
  allWorkingDirectories,
  pathInWorkingPath,
} from '../src/filesystem.ts'
import {
  addDirHelpMessage,
  validateDirectoryForWorkspace,
  type AddDirectoryResult,
} from '../src/commands/add-dir/validation.ts'

const RAIZ = mkdtempSync('/dev/shm/permiso-workspace-')
/** Un árbol APARTE: lo que está bajo RAIZ ya está cubierto por el cwd. */
const FUERA = mkdtempSync('/dev/shm/permiso-fuera-')
afterAll(() => {
  rmSync(RAIZ, { recursive: true, force: true })
  rmSync(FUERA, { recursive: true, force: true })
})

/** Un contexto con los directorios adicionales que el caso declare. */
function contexto(adicionales: string[] = []) {
  return {
    permissionRules: {},
    additionalWorkingDirectories: new Map(adicionales.map(d => [d, 'session'])),
  }
}

beforeEach(() => {
  installPermissionHostBindings({
    getOriginalCwd: () => RAIZ,
    expandPath: (p: string) => p,
    containsPathTraversal: (p: string) => p.split('/').includes('..'),
  } as never)
})

describe('pathInWorkingPath — 5 casos', () => {
  test('1. una ruta está dentro de sí misma', () => {
    expect(pathInWorkingPath('/casa/proyecto', '/casa/proyecto')).toBe(true)
  })

  test('2. una subruta está dentro', () => {
    expect(pathInWorkingPath('/casa/proyecto/src/a.ts', '/casa/proyecto')).toBe(true)
  })

  test('3. una hermana NO está dentro', () => {
    expect(pathInWorkingPath('/casa/otro', '/casa/proyecto')).toBe(false)
  })

  test('4. el padre NO está dentro de la hija', () => {
    // Sin esta dirección, un directorio de trabajo hondo autorizaría todo lo
    // que está por encima de él.
    expect(pathInWorkingPath('/casa', '/casa/proyecto')).toBe(false)
  })

  test('5. normaliza los enlaces de macOS antes de comparar', () => {
    expect(pathInWorkingPath('/private/var/datos/x', '/var/datos')).toBe(true)
    expect(pathInWorkingPath('/private/tmp/x', '/tmp')).toBe(true)
  })

  test('22. la comparación no distingue caja', () => {
    // En un sistema de archivos que no la distingue —macOS, Windows— comparar
    // con caja dejaría pasar `.cLauDe` donde la regla dice `.claude`.
    expect(pathInWorkingPath('/Casa/Proyecto/src', '/casa/proyecto')).toBe(true)
  })

  test('23. sin el binding de travesía, el confinamiento se ABRE', () => {
    // No es un defecto del puerto: la fuente pone `containsPathTraversal` en
    // el anfitrión, con respaldo `false`. Este caso deja escrito que la fuerza
    // de la guarda vive en quien instala los bindings, no aquí — un anfitrión
    // que no lo declare hace que el padre cuente como «dentro» de la hija.
    installPermissionHostBindings({
      getOriginalCwd: () => RAIZ,
      expandPath: (p: string) => p,
    } as never)
    expect(pathInWorkingPath('/casa', '/casa/proyecto')).toBe(true)
  })
})

describe('allWorkingDirectories — 3 casos', () => {
  test('6. el cwd original SIEMPRE está', () => {
    expect([...allWorkingDirectories(contexto())]).toEqual([RAIZ])
  })

  test('7. suma los adicionales del contexto', () => {
    const vistos = allWorkingDirectories(contexto(['/otro/sitio']))
    expect(vistos.has(RAIZ)).toBe(true)
    expect(vistos.has('/otro/sitio')).toBe(true)
  })

  test('8. es un conjunto: un adicional igual al cwd no se duplica', () => {
    expect(allWorkingDirectories(contexto([RAIZ])).size).toBe(1)
  })
})

describe('validateDirectoryForWorkspace — 8 casos', () => {
  test('9. la ruta vacía tiene su propio veredicto', async () => {
    expect((await validateDirectoryForWorkspace('', contexto())).resultType).toBe('emptyPath')
  })

  test('10. una ruta inexistente se lee como no encontrada, con su absoluta', async () => {
    const r = await validateDirectoryForWorkspace(join(RAIZ, 'no-existe'), contexto())
    expect(r.resultType).toBe('pathNotFound')
    expect((r as { absolutePath: string }).absolutePath).toBe(join(RAIZ, 'no-existe'))
  })

  test('11. un archivo no es un directorio', async () => {
    const archivo = join(RAIZ, 'un-archivo.txt')
    writeFileSync(archivo, 'x')
    expect((await validateDirectoryForWorkspace(archivo, contexto())).resultType).toBe('notADirectory')
  })

  test('12. un directorio nuevo entra, y la barra final se normaliza', async () => {
    // Tiene que estar FUERA del cwd: lo que cuelga de él ya está cubierto, y
    // usar una subruta de RAIZ mediría el caso 13, no éste.
    const dir = join(FUERA, 'nuevo')
    mkdirSync(dir, { recursive: true })
    const r = await validateDirectoryForWorkspace(dir + '/', contexto())
    expect(r.resultType).toBe('success')
    // Sin el `resolve`, `/foo` y `/foo/` serían dos claves distintas.
    expect((r as { absolutePath: string }).absolutePath).toBe(dir)
  })

  test('13. un directorio ya cubierto no se añade dos veces', async () => {
    const dentro = join(RAIZ, 'dentro')
    mkdirSync(dentro, { recursive: true })
    const r = await validateDirectoryForWorkspace(dentro, contexto())
    expect(r.resultType).toBe('alreadyInWorkingDirectory')
    expect((r as { workingDir: string }).workingDir).toBe(RAIZ)
  })

  test('14. un padre que es archivo se lee como no encontrada, no revienta', async () => {
    // ENOTDIR es uno de los cuatro que la fuente trata como «no está»: un
    // directorio adicional inaccesible no puede tumbar el arranque.
    const archivo = join(RAIZ, 'padre.txt')
    writeFileSync(archivo, 'x')
    const r = await validateDirectoryForWorkspace(join(archivo, 'hijo'), contexto())
    expect(r.resultType).toBe('pathNotFound')
  })

  test('15. un errno que NO es de los cuatro se relanza', async () => {
    // Discrimina la lista: sin ella, cualquier fallo de `stat` se leería como
    // «no está», y un defecto real quedaría escondido tras un veredicto suave.
    const larguisima = '/' + 'x'.repeat(5000)
    await expect(validateDirectoryForWorkspace(larguisima, contexto())).rejects.toThrow()
  })

  test('16. el mensaje cubre los cinco veredictos y nombra la ruta', () => {
    const casos: AddDirectoryResult[] = [
      { resultType: 'emptyPath' },
      { resultType: 'pathNotFound', directoryPath: 'd', absolutePath: '/a/d' },
      { resultType: 'notADirectory', directoryPath: 'd', absolutePath: '/a/d' },
      { resultType: 'alreadyInWorkingDirectory', directoryPath: 'd', workingDir: '/a' },
      { resultType: 'success', absolutePath: '/a/d' },
    ]
    const mensajes = casos.map(addDirHelpMessage)
    expect(mensajes.every(m => m.length > 0)).toBe(true)
    expect(new Set(mensajes).size).toBe(5)
    // El de «no es un directorio» sugiere el padre, que es lo que el usuario
    // quería casi siempre.
    expect(mensajes[2]).toContain('/a')
  })
})

describe('generateSessionName — 5 casos', () => {
  /** Lo que el proveedor devolverá en el caso en curso. */
  let respuesta: { contenido: unknown } | { revienta: Error } = { contenido: '{}' }
  let llamadas = 0

  mock.module('@thyrox/provider/claude.js', () => ({
    queryHaiku: async () => {
      llamadas++
      if ('revienta' in respuesta) throw respuesta.revienta
      return { message: { content: respuesta.contenido } }
    },
  }))

  async function generar(mensajes: unknown[]): Promise<string | null> {
    const { generateSessionName } = await import(
      '../src/commands/rename/generateSessionName.ts'
    )
    return generateSessionName(mensajes as never, new AbortController().signal)
  }

  beforeEach(() => {
    llamadas = 0
    respuesta = { contenido: '{}' }
  })

  test('17. sin texto de conversación no se llama al proveedor', async () => {
    expect(await generar([])).toBeNull()
    expect(llamadas).toBe(0)
  })

  test('18. con un nombre válido, lo devuelve', async () => {
    respuesta = { contenido: '{"name":"fix-login-bug"}' }
    expect(await generar([mensajeUsuario('arregla el login')])).toBe('fix-login-bug')
    expect(llamadas).toBe(1)
  })

  test('19. una respuesta sin campo `name` da null, no una cadena rara', async () => {
    respuesta = { contenido: '{"titulo":"otra cosa"}' }
    expect(await generar([mensajeUsuario('arregla el login')])).toBeNull()
  })

  test('20. una respuesta que no es JSON da null', async () => {
    respuesta = { contenido: 'lo siento, no puedo' }
    expect(await generar([mensajeUsuario('arregla el login')])).toBeNull()
  })

  test('21. si el proveedor revienta, devuelve null en vez de propagar', async () => {
    // Se llama automáticamente cada tres mensajes: propagar aquí inundaría el
    // archivo de errores con fallos operativos esperados.
    respuesta = { revienta: new Error('429 rate limited') }
    expect(await generar([mensajeUsuario('arregla el login')])).toBeNull()
  })
})

function mensajeUsuario(texto: string) {
  return { type: 'user', message: { role: 'user', content: texto } }
}
