/**
 * TDD de `pathInAllowedWorkingPath` y `getResolvedWorkingDirPaths` —
 * TASK-DOCS-0526 («Completar permission: 110 de 133 siguen fuera, y 88
 * son un bloque decidible» — subject verificado contra
 * agent_store.sqlite3, tabla `tasks`, task_id=1137).
 *
 * Procedencia: `ccnmt: packages/permission/src/filesystem.ts:690-716`
 * (paquete `permission`, licencia UNLICENSED — reimplementación, no copia).
 * Cierre transitivo portado en el mismo pase: `getPathsForPermissionCheck`
 * (séptimo binding `_b()`, `filesystem.ts:34`) y su envoltorio memoizado
 * `getResolvedWorkingDirPaths` (`filesystem.ts:687`). Las dos dependencias
 * restantes de `pathInAllowedWorkingPath` — `allWorkingDirectories` y
 * `pathInWorkingPath` — ya estaban portadas (pase de 2026-09-08,
 * `workspaceAndRename.test.ts`).
 *
 * Métrica: el veredicto de `pathInAllowedWorkingPath` sobre rutas reales del
 * sistema de archivos, con y sin el binding `getPathsForPermissionCheck`
 * instalado.
 * Ciega a: la resolución real de symlinks — el binding se ejercita con un
 * stub identidad, no con `fs.realpathSync`.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { installPermissionHostBindings } from '../src/host.ts'
import {
  getResolvedWorkingDirPaths,
  pathInAllowedWorkingPath,
} from '../src/filesystem.ts'

const RAIZ = mkdtempSync('/dev/shm/permiso-allowed-')
const OTRA = mkdtempSync('/dev/shm/permiso-allowed-otra-')
const FUERA = mkdtempSync('/dev/shm/permiso-allowed-fuera-')

afterAll(() => {
  rmSync(RAIZ, { recursive: true, force: true })
  rmSync(OTRA, { recursive: true, force: true })
  rmSync(FUERA, { recursive: true, force: true })
  // Neutraliza el singleton para no filtrar bindings a los archivos de test
  // que corran después de éste en el mismo proceso bun test (host.ts:12).
  installPermissionHostBindings({})
})

function contexto(adicionales: string[] = []) {
  return {
    permissionRules: {},
    additionalWorkingDirectories: new Map(adicionales.map(d => [d, 'session'])),
  }
}

describe('pathInAllowedWorkingPath — con getPathsForPermissionCheck identidad', () => {
  let llamadas = 0

  beforeEach(() => {
    llamadas = 0
    getResolvedWorkingDirPaths.cache.clear()
    installPermissionHostBindings({
      getOriginalCwd: () => RAIZ,
      expandPath: (p: string) => p,
      containsPathTraversal: (p: string) => p.split('/').includes('..'),
      getPathsForPermissionCheck: (p: string) => {
        llamadas++
        return [p]
      },
    } as never)
  })

  test('1. una ruta dentro del cwd original: allow', () => {
    expect(pathInAllowedWorkingPath(`${RAIZ}/a.ts`, contexto())).toBe(true)
  })

  test('2. una ruta fuera de todo directorio de trabajo: deny', () => {
    expect(pathInAllowedWorkingPath(`${FUERA}/a.ts`, contexto())).toBe(false)
  })

  test('3. un directorio de trabajo adicional también autoriza', () => {
    expect(
      pathInAllowedWorkingPath(`${OTRA}/b.ts`, contexto([OTRA])),
    ).toBe(true)
  })

  test('4. precomputedPathsToCheck se usa en vez de recomputar', () => {
    // El primer argumento (`path`) apunta FUERA; el precomputado apunta
    // DENTRO — si la función recomputara en vez de usar el precomputado,
    // este caso daría false.
    llamadas = 0
    const veredicto = pathInAllowedWorkingPath(`${FUERA}/x.ts`, contexto(), [
      `${RAIZ}/x.ts`,
    ])
    expect(veredicto).toBe(true)
    // getPathsForPermissionCheck se llama para resolver el ÚNICO working
    // directory (RAIZ), nunca para `path` — precomputedPathsToCheck lo evita.
    expect(llamadas).toBe(1)
  })

  test('5. getResolvedWorkingDirPaths memoiza por argumento', () => {
    llamadas = 0
    const a = getResolvedWorkingDirPaths(RAIZ)
    const b = getResolvedWorkingDirPaths(RAIZ)
    expect(a).toEqual(b)
    expect(llamadas).toBe(1)
  })

  test('6. getResolvedWorkingDirPaths no comparte caché entre argumentos', () => {
    llamadas = 0
    getResolvedWorkingDirPaths(RAIZ)
    getResolvedWorkingDirPaths(OTRA)
    expect(llamadas).toBe(2)
  })
})

describe('pathInAllowedWorkingPath — control: sin getPathsForPermissionCheck', () => {
  beforeEach(() => {
    // Aisla del describe anterior: `getResolvedWorkingDirPaths` es un
    // memoize de MÓDULO — sin limpiar, `RAIZ` seguiría cacheado con el
    // stub identidad de arriba y este control no mediría nada.
    getResolvedWorkingDirPaths.cache.clear()
  })

  test('7. CONTROL — sin el binding, pathsToCheck vacío da allow vacuo', () => {
    // No es un defecto del puerto: es lo que la fuente hace literalmente
    // (`_b().getPathsForPermissionCheck?.() ?? []`, y `[].every(...)` es
    // `true`). El acorazamiento real vive en quien instala el binding — el
    // mismo principio que el caso 23 de `workspaceAndRename.test.ts` deja
    // escrito para `containsPathTraversal`.
    installPermissionHostBindings({ getOriginalCwd: () => RAIZ } as never)
    expect(pathInAllowedWorkingPath(`${FUERA}/x.ts`, contexto())).toBe(true)
  })

  test('8. con precomputedPathsToCheck no vacío, el mismo binding ausente cierra a deny', () => {
    // workingPaths también se resuelve por el binding ausente → [] → deny.
    installPermissionHostBindings({ getOriginalCwd: () => RAIZ } as never)
    expect(
      pathInAllowedWorkingPath(`${FUERA}/x.ts`, contexto(), [`${FUERA}/x.ts`]),
    ).toBe(false)
  })
})
