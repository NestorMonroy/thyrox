/**
 * `detectRepository.ts` — qué repositorio de GitHub es éste.
 *
 * Procedencia del sujeto: `ccnmt: packages/storage/src/detectRepository.ts`
 * (121 líneas, 6 exports). El puerto vigente declara UNO y llama al resto
 * «divergencia de alcance» por tres dependencias que ya no faltan.
 *
 * La distinción que estos casos vigilan es la de HOST. El módulo tiene dos
 * caras a propósito: `detectCurrentRepositoryWithHost` responde por cualquier
 * host —una instalación privada de GitHub incluida— y
 * `detectCurrentRepository` filtra a github.com, porque quien la llama
 * construye URLs de github.com con su respuesta. Colapsarlas produce enlaces
 * rotos que apuntan al sitio equivocado, no un error.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let base: string
let cwdOriginal: string

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'detect-'))
  cwdOriginal = process.cwd()
})

afterEach(() => {
  process.chdir(cwdOriginal)
  rmSync(base, { recursive: true, force: true })
  mock.restore()
})

/** Un repositorio real con el remoto que el caso necesita. */
function repoConRemoto(nombre: string, url: string | null): string {
  const dir = join(base, nombre)
  mkdirSync(dir, { recursive: true })
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir })
  if (url) {
    execFileSync('git', ['remote', 'add', 'origin', url], { cwd: dir })
  }
  return dir
}

describe('parseGitHubRepository — la entrada de texto', () => {
  test('1. una URL https de github.com da owner/repo', async () => {
    const { parseGitHubRepository } = await import('../detectRepository.ts')
    expect(parseGitHubRepository('https://github.com/o/r.git')).toBe('o/r')
  })

  test('2. una URL de OTRO host devuelve null, no el owner/repo', async () => {
    // Es el punto entero de la función: quien la llama arma una URL de
    // github.com con la respuesta. Devolver `o/r` de un host privado produce
    // un enlace que apunta al sitio equivocado y parece correcto.
    const { parseGitHubRepository } = await import('../detectRepository.ts')
    expect(parseGitHubRepository('https://ghe.interno/o/r.git')).toBeNull()
  })

  test('3. un `owner/repo` pelado se acepta por retrocompatibilidad', async () => {
    const { parseGitHubRepository } = await import('../detectRepository.ts')
    expect(parseGitHubRepository('  o/r  ')).toBe('o/r')
    expect(parseGitHubRepository('o/r.git')).toBe('o/r')
  })

  test('4. lo que no es ninguna de las dos formas devuelve null', async () => {
    const { parseGitHubRepository } = await import('../detectRepository.ts')
    expect(parseGitHubRepository('sueltosinbarra')).toBeNull()
    expect(parseGitHubRepository('a/b/c')).toBeNull()
  })
})

describe('detectCurrentRepositoryWithHost — la lectura del remoto', () => {
  test('5. responde por CUALQUIER host, no sólo github.com', async () => {
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => 'https://ghe.interno/o/r.git',
    }))
    mod.clearRepositoryCaches()
    const r = await mod.detectCurrentRepositoryWithHost()
    expect(r).toEqual({ host: 'ghe.interno', owner: 'o', name: 'r' })
  })

  test('6. y su hermana FILTRA a github.com sobre el mismo remoto', async () => {
    // El par es lo que discrimina: mismo remoto, dos respuestas.
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => 'https://ghe.interno/o/r.git',
    }))
    mod.clearRepositoryCaches()
    expect(await mod.detectCurrentRepositoryWithHost()).not.toBeNull()
    expect(await mod.detectCurrentRepository()).toBeNull()
  })

  test('7. sin remoto devuelve null y lo CACHEA', async () => {
    // Cachear el null también importa: si sólo se cachea el acierto, cada
    // consulta en un repo sin remoto vuelve a lanzar git.
    let lecturas = 0
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => {
        lecturas++
        return null
      },
    }))
    mod.clearRepositoryCaches()
    expect(await mod.detectCurrentRepositoryWithHost()).toBeNull()
    expect(await mod.detectCurrentRepositoryWithHost()).toBeNull()
    expect(lecturas).toBe(1)
  })

  test('8. un error al leer el remoto se traga y cachea como null', async () => {
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => {
        throw new Error('git explotó')
      },
    }))
    mod.clearRepositoryCaches()
    expect(await mod.detectCurrentRepositoryWithHost()).toBeNull()
  })

  test('9. la caché es POR directorio, no global', async () => {
    // Dos worktrees o dos proyectos abiertos a la vez tienen remotos
    // distintos; una caché global le daría a uno la respuesta del otro.
    const mod = await import('../detectRepository.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const urls = new Map([
      [join(base, 'uno'), 'https://github.com/a/uno.git'],
      [join(base, 'dos'), 'https://github.com/b/dos.git'],
    ])
    let actual = ''
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => urls.get(actual) ?? null,
    }))
    mod.clearRepositoryCaches()
    mkdirSync(join(base, 'uno'))
    mkdirSync(join(base, 'dos'))
    actual = join(base, 'uno')
    const a = await runWithCwdOverride(actual, () =>
      mod.detectCurrentRepository(),
    )
    actual = join(base, 'dos')
    const b = await runWithCwdOverride(actual, () =>
      mod.detectCurrentRepository(),
    )
    expect(a).toBe('a/uno')
    expect(b).toBe('b/dos')
  })
})

describe('getCachedRepository — la lectura SÍNCRONA', () => {
  test('10. sin haber resuelto antes, devuelve null en vez de esperar', async () => {
    // Es síncrona a propósito: la usa código que no puede esperar. Si no hay
    // nada cacheado, la respuesta honesta es null, no un valor a medias.
    const mod = await import('../detectRepository.ts')
    mod.clearRepositoryCaches()
    expect(mod.getCachedRepository()).toBeNull()
  })

  test('11. tras resolver, devuelve el owner/repo cacheado', async () => {
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => 'https://github.com/o/r.git',
    }))
    mod.clearRepositoryCaches()
    await mod.detectCurrentRepository()
    expect(mod.getCachedRepository()).toBe('o/r')
  })

  test('12. un host que NO es github.com queda fuera también aquí', async () => {
    // La caché guarda el resultado con su host; el filtro se aplica al leer.
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => 'https://ghe.interno/o/r.git',
    }))
    mod.clearRepositoryCaches()
    await mod.detectCurrentRepositoryWithHost()
    expect(mod.getCachedRepository()).toBeNull()
  })

  test('13. `clearRepositoryCaches` de verdad vacía', async () => {
    const mod = await import('../detectRepository.ts')
    mock.module('../git.js', () => ({
      getRemoteUrl: async () => 'https://github.com/o/r.git',
    }))
    mod.clearRepositoryCaches()
    await mod.detectCurrentRepository()
    expect(mod.getCachedRepository()).toBe('o/r')
    mod.clearRepositoryCaches()
    expect(mod.getCachedRepository()).toBeNull()
  })

  test('14. el repo real de un temporal sin remoto no inventa nada', async () => {
    // Control con un repositorio de verdad, sin sustituir `git.js`: la
    // pregunta es si el módulo se apoya en algo más que el remoto.
    const mod = await import('../detectRepository.ts')
    process.chdir(repoConRemoto('sin-remoto', null))
    mod.clearRepositoryCaches()
    expect(mod.getCachedRepository()).toBeNull()
  })
})
