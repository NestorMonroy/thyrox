/**
 * Dónde viven, en una instalación, el catálogo de modelos locales, sus
 * cualificaciones, la caché de artefactos GGUF y el índice de ubicaciones de
 * sus artefactos permanentes. Es estado de la instalación, no del
 * repositorio: cae bajo `.thyrox/models/` de la raíz de thyrox salvo que el
 * consumidor declare otra ruta (`THYROX_MODEL_CATALOG`,
 * `THYROX_MODEL_QUALIFICATIONS`, `THYROX_MODEL_ARTIFACT_CACHE_DIR`,
 * `THYROX_MODEL_ARTIFACT_LOCATIONS`).
 */

export const MODEL_CATALOG_VAR = 'THYROX_MODEL_CATALOG'
export const MODEL_QUALIFICATIONS_VAR = 'THYROX_MODEL_QUALIFICATIONS'
export const MODEL_ARTIFACT_CACHE_DIR_VAR = 'THYROX_MODEL_ARTIFACT_CACHE_DIR'
export const MODEL_ARTIFACT_LOCATIONS_VAR = 'THYROX_MODEL_ARTIFACT_LOCATIONS'

const DEFAULT_MODELS_DIR = '.thyrox/models'

export interface LocalModelHome {
  readonly catalog: string
  readonly qualifications: string
}

/** Los hogares de los artefactos de modelo que el reconciliador `ensureModel` lee y escribe. */
export interface LocalArtifactHome {
  /** Directorio de los GGUF verificados, nombrados por su contenido. */
  readonly artifactCache: string
  /** JSON del índice de ubicaciones (`ArtifactLocationIndex`). */
  readonly artifactLocations: string
}

function declared(env: Readonly<Record<string, string | undefined>>, key: string): string | undefined {
  const value = env[key]?.trim()
  return value ? value : undefined
}

function modelsDir(thyroxRoot: string): string {
  return `${thyroxRoot.replace(/\/+$/, '')}/${DEFAULT_MODELS_DIR}`
}

/** Las dos rutas: las declaradas, o las de `.thyrox/models/` bajo `thyroxRoot`. */
export function localModelHome(env: Readonly<Record<string, string | undefined>>, thyroxRoot: string): LocalModelHome {
  const base = modelsDir(thyroxRoot)
  return {
    catalog: declared(env, MODEL_CATALOG_VAR) ?? `${base}/catalog.json`,
    qualifications: declared(env, MODEL_QUALIFICATIONS_VAR) ?? `${base}/qualifications.json`,
  }
}

/** La caché de artefactos y su índice de ubicaciones: los declarados, o los de `.thyrox/models/` bajo `thyroxRoot`. */
export function localArtifactHome(env: Readonly<Record<string, string | undefined>>, thyroxRoot: string): LocalArtifactHome {
  const base = modelsDir(thyroxRoot)
  return {
    artifactCache: declared(env, MODEL_ARTIFACT_CACHE_DIR_VAR) ?? `${base}/artifacts`,
    artifactLocations: declared(env, MODEL_ARTIFACT_LOCATIONS_VAR) ?? `${base}/artifact-locations.json`,
  }
}
