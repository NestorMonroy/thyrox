/**
 * `ensureModel(name, deps)`: el reconciliador idempotente que deja disponible
 * un modelo del catálogo en un runtime (TASK-THYROX-0729). No es
 * `download()+install()`: cada paso mide el estado y actúa sólo si no es el
 * pedido, así que la segunda llamada no descarga ni instala.
 *
 * Responde una sola pregunta —¿puede este runtime servir este modelo
 * concreto?—. No decide GPU, instancia, residencia ni endpoint
 * (TASK-THYROX-0703).
 *
 * READY exige tres digests iguales, cada uno medido: el sha256 del catálogo,
 * el del GGUF materializado (el que `materializeArtifact` midió sobre el
 * archivo antes de publicarlo en la caché) y el contenido que el runtime resuelve para el nombre después de
 * cualquier instalación. Un instalador que responde `installed` y sirve otra
 * cosa no deja READY. `downloaded` e `installed` dicen lo que ocurrió en esta
 * llamada, no lo que se supone.
 */
import type { CatalogArtifact, ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { ModelArtifactResolver, PinnedModelArtifact } from '@thyrox/model-artifacts/modelArtifactResolver.ts'

import { materializeArtifact, type ArtifactFetcher } from './modelArtifactCache.js'
import type { InstalledModelState, ModelInstaller } from './modelInstaller.js'

/** La parte del catálogo que el reconciliador consulta. */
export interface CatalogLookup {
  byName(name: string): ModelCatalogEntry | undefined
}

export interface EnsureModelDependencies {
  readonly catalog: CatalogLookup
  readonly resolver: ModelArtifactResolver
  readonly fetcher: ArtifactFetcher
  readonly installer: ModelInstaller
  readonly cacheDir: string
}

/** Los tres digests cuya igualdad es READY. */
export interface ReadinessEvidence {
  readonly catalogSha256: string
  readonly materializedSha256: string
  /** Vacío si el runtime no resuelve el nombre: nunca coincide con un sha256. */
  readonly runtimeSha256: string
}

/** Dónde se detuvo una reconciliación fallida. */
export type EnsureStage = 'materialize' | 'install' | 'verify'

export type EnsureOutcome =
  | { readonly status: 'ready'; readonly name: string; readonly evidence: ReadinessEvidence; readonly downloaded: boolean; readonly installed: boolean }
  | { readonly status: 'not_declared'; readonly name: string }
  | { readonly status: 'not_materializable'; readonly name: string; readonly reason: string }
  | { readonly status: 'failed'; readonly name: string; readonly stage: EnsureStage; readonly reason: string; readonly downloaded: boolean; readonly installed: boolean }

/** Un GGUF verificado en la caché y lo que costó tenerlo. */
interface Materialized {
  readonly path: string
  readonly sha256: string
  readonly downloaded: boolean
}

/** Lo que el runtime resuelve tras reconciliar, y si hubo que instalar. */
interface Reconciled {
  readonly state: InstalledModelState | undefined
  readonly installed: boolean
}

type StepResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string }

export async function ensureModel(name: string, deps: EnsureModelDependencies): Promise<EnsureOutcome> {
  const entry = deps.catalog.byName(name)
  if (entry === undefined) return { status: 'not_declared', name }
  const resolution = await deps.resolver.resolve(entry.artifact)
  if (resolution.status !== 'resolved') return { status: 'not_materializable', name, reason: resolution.reason }

  const materialized = await materialize(entry.artifact, resolution.pinned, deps)
  if (!materialized.ok) return { status: 'failed', name, stage: 'materialize', reason: materialized.reason, downloaded: false, installed: false }
  const { downloaded } = materialized.value

  const reconciled = await reconcileRuntime(name, materialized.value, deps.installer)
  if (!reconciled.ok) return { status: 'failed', name, stage: 'install', reason: reconciled.reason, downloaded, installed: false }
  const { installed, state } = reconciled.value

  const evidence = { catalogSha256: entry.artifact.sha256, materializedSha256: materialized.value.sha256, runtimeSha256: state?.contentSha256 ?? '' }
  if (!isReady(evidence)) return { status: 'failed', name, stage: 'verify', reason: mismatchReason(name, evidence), downloaded, installed }
  return { status: 'ready', name, evidence, downloaded, installed }
}

async function materialize(artifact: CatalogArtifact, pinned: PinnedModelArtifact, deps: EnsureModelDependencies): Promise<StepResult<Materialized>> {
  const outcome = await materializeArtifact({ artifact, pinned, cacheDir: deps.cacheDir, fetcher: deps.fetcher })
  if ('reason' in outcome) return { ok: false, reason: outcome.reason }
  // `materializeArtifact` sólo devuelve `cached`/`fetched` tras medir el
  // sha256 del archivo publicado: ese es el digest materializado.
  return { ok: true, value: { path: outcome.path, sha256: outcome.sha256, downloaded: outcome.status === 'fetched' } }
}

/** Instala sólo si el runtime no resuelve el nombre al contenido materializado, y vuelve a inspeccionar. */
async function reconcileRuntime(name: string, materialized: Materialized, installer: ModelInstaller): Promise<StepResult<Reconciled>> {
  const current = await installer.inspect(name)
  if (servesContent(current, materialized.sha256)) return { ok: true, value: { state: current, installed: false } }
  const outcome = await installer.install({ name, artifactPath: materialized.path, contentSha256: materialized.sha256 })
  if (outcome.status !== 'installed') return { ok: false, reason: outcome.reason }
  return { ok: true, value: { state: await installer.inspect(name), installed: true } }
}

function servesContent(state: InstalledModelState | undefined, sha256: string): boolean {
  return state?.contentSha256 === sha256
}

function isReady(evidence: ReadinessEvidence): boolean {
  return evidence.catalogSha256 === evidence.materializedSha256 && evidence.materializedSha256 === evidence.runtimeSha256
}

function mismatchReason(name: string, evidence: ReadinessEvidence): string {
  const runtime = evidence.runtimeSha256 === '' ? 'nada' : `sha256:${evidence.runtimeSha256}`
  return `${name}: el catálogo declara sha256:${evidence.catalogSha256}, la caché tiene sha256:${evidence.materializedSha256} y el runtime resuelve ${runtime}`
}
