/**
 * Creacion de bundle git + subida para el seed-bundle de CCR.
 *
 * Flujo:
 *   1. git stash create → update-ref refs/seed/stash (lo hace alcanzable)
 *   2. git bundle create --all (empaqueta refs/seed/stash + sus objetos)
 *   3. Subida a /v1/files
 *   4. Limpieza de refs/seed/stash (no ensuciar el repo del usuario)
 *   5. El llamador fija seed_bundle_file_id en SessionContext
 *
 * Puerto de `ccnmt: packages/teleport/src/gitBundle.ts` (293 líneas
 * fuente). Cobertura: 1 de 2 símbolos exportados por la fuente —
 * `createAndUploadGitBundle` (100% de su cuerpo). El segundo símbolo de
 * la fuente, `FilesApiConfig` (tipo re-exportado desde
 * `provider/filesApi.ts`), NO existe en este árbol: medido con
 * `Bun.resolveSync("@thyrox/provider/filesApi.js", cwd)` →
 * "Cannot find module". Se declara aquí un `FilesApiConfig` LOCAL que
 * espeja la forma de la fuente (oauthToken/baseUrl/sessionId) para que la
 * firma de `createAndUploadGitBundle` no dependa de un módulo ausente; el
 * `uploadFile` real se resuelve con `require()` diferido en el único
 * punto donde se necesita, con la misma razón medida.
 *
 * Segunda divergencia declarada: `gitExe()` (whichSync('git') || 'git')
 * vive en `ccnmt: packages/storage/src/git.ts:131`, pero
 * `storage/src/git.ts` de ESTE árbol es un porte PARCIAL DECLARADO (ver
 * su propio docstring) que no lo incluye — depende de `shell/which.js`,
 * que en ese pase no estaba disponible. `shell` SÍ existe hoy
 * (`@thyrox/shell/which.js`), así que aquí se reimplementa localmente
 * `_gitExe()` con el mismo mecanismo, sin tocar el paquete `storage`
 * (fuera de las rutas asignadas a este agente).
 */

import { stat, unlink } from 'fs/promises'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { execFileNoThrowWithCwd } from '@thyrox/shell/execFileNoThrow.js'
import { whichSync } from '@thyrox/shell/which.js'
import { findGitRoot } from '@thyrox/storage/findGitRoot.js'
import { generateTempFilePath } from '@thyrox/storage/tempfile.js'

// Ajustable vía tengu_ccr_bundle_max_bytes.
const DEFAULT_BUNDLE_MAX_BYTES = 100 * 1024 * 1024

type BundleScope = 'all' | 'head' | 'squashed'

export type BundleUploadResult =
  | {
      success: true
      fileId: string
      bundleSizeBytes: number
      scope: BundleScope
      hasWip: boolean
    }
  | { success: false; error: string; failReason?: BundleFailReason }

type BundleFailReason = 'git_error' | 'too_large' | 'empty_repo'

type BundleCreateResult =
  | { ok: true; size: number; scope: BundleScope }
  | { ok: false; error: string; failReason: BundleFailReason }

/**
 * Configuracion del cliente de la Files API. Espejo local de
 * `ccnmt: packages/provider/src/filesApi.ts:59` — ese módulo no existe
 * en `@thyrox/provider` (medido arriba). Se retira en cuanto ese puerto
 * exista, sustituyendo este alias por el import real.
 */
export type FilesApiConfig = {
  oauthToken: string
  baseUrl?: string
  sessionId: string
}

let _gitExeCache: string | undefined

/** Ver docstring del módulo — reimplementación local de `gitExe()`. */
function _gitExe(): string {
  return (_gitExeCache ??= whichSync('git') || 'git')
}

// Bundle --all → HEAD → squashed-root. HEAD descarta ramas laterales y
// tags pero conserva el historial completo de la rama actual.
// Squashed-root es un unico commit sin padre del arbol de HEAD (o del
// arbol del stash si hay WIP) — sin historial, solo el snapshot. El
// receptor necesita manejo de refs/seed/root para ese nivel.
async function _bundleWithFallback(
  gitRoot: string,
  bundlePath: string,
  maxBytes: number,
  hasStash: boolean,
  signal: AbortSignal | undefined,
): Promise<BundleCreateResult> {
  // --all recoge refs/seed/stash; HEAD lo necesita explicito.
  const extra = hasStash ? ['refs/seed/stash'] : []
  const mkBundle = (base: string) =>
    execFileNoThrowWithCwd(
      _gitExe(),
      ['bundle', 'create', bundlePath, base, ...extra],
      { cwd: gitRoot, abortSignal: signal },
    )

  const allResult = await mkBundle('--all')
  if (allResult.code !== 0) {
    return {
      ok: false,
      error: `git bundle create --all failed (${allResult.code}): ${allResult.stderr.slice(0, 200)}`,
      failReason: 'git_error',
    }
  }

  const { size: allSize } = await stat(bundlePath)
  if (allSize <= maxBytes) {
    return { ok: true, size: allSize, scope: 'all' }
  }

  // bundle create sobreescribe en el mismo sitio.
  logForDebugging(
    `[gitBundle] --all bundle is ${(allSize / 1024 / 1024).toFixed(1)}MB (> ${(maxBytes / 1024 / 1024).toFixed(0)}MB), retrying HEAD-only`,
  )
  const headResult = await mkBundle('HEAD')
  if (headResult.code !== 0) {
    return {
      ok: false,
      error: `git bundle create HEAD failed (${headResult.code}): ${headResult.stderr.slice(0, 200)}`,
      failReason: 'git_error',
    }
  }

  const { size: headSize } = await stat(bundlePath)
  if (headSize <= maxBytes) {
    return { ok: true, size: headSize, scope: 'head' }
  }

  // Ultimo recurso: comprime a un unico commit sin padre. Usa el arbol
  // del stash cuando hay WIP (hornea los cambios sin commitear — no se
  // puede empaquetar la ref del stash por separado porque sus padres
  // arrastrarian el historial de vuelta).
  logForDebugging(
    `[gitBundle] HEAD bundle is ${(headSize / 1024 / 1024).toFixed(1)}MB, retrying squashed-root`,
  )
  const treeRef = hasStash ? 'refs/seed/stash^{tree}' : 'HEAD^{tree}'
  const commitTree = await execFileNoThrowWithCwd(
    _gitExe(),
    ['commit-tree', treeRef, '-m', 'seed'],
    { cwd: gitRoot, abortSignal: signal },
  )
  if (commitTree.code !== 0) {
    return {
      ok: false,
      error: `git commit-tree failed (${commitTree.code}): ${commitTree.stderr.slice(0, 200)}`,
      failReason: 'git_error',
    }
  }
  const squashedSha = commitTree.stdout.trim()
  await execFileNoThrowWithCwd(
    _gitExe(),
    ['update-ref', 'refs/seed/root', squashedSha],
    { cwd: gitRoot },
  )
  const squashResult = await execFileNoThrowWithCwd(
    _gitExe(),
    ['bundle', 'create', bundlePath, 'refs/seed/root'],
    { cwd: gitRoot, abortSignal: signal },
  )
  if (squashResult.code !== 0) {
    return {
      ok: false,
      error: `git bundle create refs/seed/root failed (${squashResult.code}): ${squashResult.stderr.slice(0, 200)}`,
      failReason: 'git_error',
    }
  }
  const { size: squashSize } = await stat(bundlePath)
  if (squashSize <= maxBytes) {
    return { ok: true, size: squashSize, scope: 'squashed' }
  }

  return {
    ok: false,
    error:
      'Repo is too large to bundle. Please setup GitHub on https://claude.ai/code',
    failReason: 'too_large',
  }
}

// Empaqueta el repo y lo sube a la Files API; devuelve el file_id para
// seed_bundle_file_id. Cadena de fallback --all → HEAD → squashed-root.
// El WIP trackeado se captura via stash create → refs/seed/stash (o se
// hornea en el arbol comprimido); lo no-trackeado no se captura.
export async function createAndUploadGitBundle(
  config: FilesApiConfig,
  opts?: { cwd?: string; signal?: AbortSignal },
): Promise<BundleUploadResult> {
  const workdir = opts?.cwd ?? getCwd()
  const gitRoot = findGitRoot(workdir)
  if (!gitRoot) {
    return { success: false, error: 'Not in a git repository' }
  }

  // Barre refs obsoletas de una corrida previa que crasheo, antes de que
  // --all las empaquete. Corre antes del check de repo-vacio, para que
  // nunca se salte por un return temprano.
  for (const ref of ['refs/seed/stash', 'refs/seed/root']) {
    await execFileNoThrowWithCwd(_gitExe(), ['update-ref', '-d', ref], {
      cwd: gitRoot,
    })
  }

  // `git bundle create` se niega a crear un bundle vacio (exit 128), y
  // `stash create` falla con "You do not have the initial commit yet".
  // Chequea si hay CUALQUIER ref (no solo HEAD) para que las ramas
  // huerfanas con commits en otro lado igual se empaqueten — `--all` las
  // recoge sin importar HEAD.
  const refCheck = await execFileNoThrowWithCwd(
    _gitExe(),
    ['for-each-ref', '--count=1', 'refs/'],
    { cwd: gitRoot },
  )
  if (refCheck.code === 0 && refCheck.stdout.trim() === '') {
    logEvent('tengu_ccr_bundle_upload', {
      outcome:
        'empty_repo' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return {
      success: false,
      error: 'Repository has no commits yet',
      failReason: 'empty_repo',
    }
  }

  // stash create escribe un commit colgante — no toca refs/stash ni el
  // working tree. Los archivos no-trackeados quedan excluidos a proposito.
  const stashResult = await execFileNoThrowWithCwd(
    _gitExe(),
    ['stash', 'create'],
    { cwd: gitRoot, abortSignal: opts?.signal },
  )
  // exit 0 + stdout vacio = nada que stashear. Nonzero es raro; no-fatal.
  const wipStashSha = stashResult.code === 0 ? stashResult.stdout.trim() : ''
  const hasWip = wipStashSha !== ''
  if (stashResult.code !== 0) {
    logForDebugging(
      `[gitBundle] git stash create failed (${stashResult.code}), proceeding without WIP: ${stashResult.stderr.slice(0, 200)}`,
    )
  } else if (hasWip) {
    logForDebugging(`[gitBundle] Captured WIP as stash ${wipStashSha}`)
    // env-runner lee el SHA via bundle list-heads refs/seed/stash.
    await execFileNoThrowWithCwd(
      _gitExe(),
      ['update-ref', 'refs/seed/stash', wipStashSha],
      { cwd: gitRoot },
    )
  }

  const bundlePath = generateTempFilePath('ccr-seed', '.bundle')

  // git deja un archivo parcial en un exit nonzero (p.ej. repo-vacio 128).
  try {
    const maxBytes =
      getFeatureValue_CACHED_MAY_BE_STALE<number | null>(
        'tengu_ccr_bundle_max_bytes',
        null,
      ) ?? DEFAULT_BUNDLE_MAX_BYTES

    const bundle = await _bundleWithFallback(
      gitRoot,
      bundlePath,
      maxBytes,
      hasWip,
      opts?.signal,
    )

    if (!bundle.ok) {
      const failedBundle = bundle as { ok: false; error: string; failReason: BundleFailReason }
      logForDebugging(`[gitBundle] ${failedBundle.error}`)
      logEvent('tengu_ccr_bundle_upload', {
        outcome:
          failedBundle.failReason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        max_bytes: maxBytes,
      })
      return {
        success: false,
        error: failedBundle.error,
        failReason: failedBundle.failReason,
      }
    }

    // Nombre relativo fijo para que CCR pueda ubicarlo.
    //
    // `@thyrox/provider/filesApi.js` no existe en este árbol (medido con
    // Bun.resolveSync, ver docstring del módulo). Se resuelve con
    // `require()` diferido — es la ÚNICA excepción admitida a
    // "sin lazy imports": el especificador no resuelve hoy, no una
    // preferencia de estilo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const filesApi = require('@thyrox/provider/filesApi.js') as {
      uploadFile: (
        filePath: string,
        relativePath: string,
        config: FilesApiConfig,
        opts?: { signal?: AbortSignal },
      ) => Promise<
        | { path: string; fileId: string; size: number; success: true }
        | { path: string; error: string; success: false }
      >
    }
    const upload = await filesApi.uploadFile(
      bundlePath,
      '_source_seed.bundle',
      config,
      { signal: opts?.signal },
    )

    if (!upload.success) {
      logEvent('tengu_ccr_bundle_upload', {
        outcome:
          'failed' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return { success: false, error: upload.error }
    }

    logForDebugging(
      `[gitBundle] Uploaded ${upload.size} bytes as file_id ${upload.fileId}`,
    )
    logEvent('tengu_ccr_bundle_upload', {
      outcome:
        'success' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      size_bytes: upload.size,
      scope:
        bundle.scope as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      has_wip: hasWip,
    })
    return {
      success: true,
      fileId: upload.fileId,
      bundleSizeBytes: upload.size,
      scope: bundle.scope,
      hasWip,
    }
  } finally {
    try {
      await unlink(bundlePath)
    } catch {
      logForDebugging(`[gitBundle] Could not delete ${bundlePath} (non-fatal)`)
    }
    // Siempre borra — tambien barre una ref obsoleta de una corrida previa
    // que crasheo. update-ref -d en una ref inexistente sale con 0.
    for (const ref of ['refs/seed/stash', 'refs/seed/root']) {
      await execFileNoThrowWithCwd(_gitExe(), ['update-ref', '-d', ref], {
        cwd: gitRoot,
      })
    }
  }
}
