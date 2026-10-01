/**
 * Dónde viven, en una instalación, el catálogo de modelos locales y sus
 * cualificaciones. Es estado de la instalación, no del repositorio: cae bajo
 * `.thyrox/models/` de la raíz de thyrox salvo que el consumidor declare otra
 * ruta (`THYROX_MODEL_CATALOG`, `THYROX_MODEL_QUALIFICATIONS`).
 */

export const MODEL_CATALOG_VAR = 'THYROX_MODEL_CATALOG'
export const MODEL_QUALIFICATIONS_VAR = 'THYROX_MODEL_QUALIFICATIONS'

const DEFAULT_MODELS_DIR = '.thyrox/models'

export interface LocalModelHome {
  readonly catalog: string
  readonly qualifications: string
}

function declared(env: Readonly<Record<string, string | undefined>>, key: string): string | undefined {
  const value = env[key]?.trim()
  return value ? value : undefined
}

/** Las dos rutas: las declaradas, o las de `.thyrox/models/` bajo `thyroxRoot`. */
export function localModelHome(env: Readonly<Record<string, string | undefined>>, thyroxRoot: string): LocalModelHome {
  const base = `${thyroxRoot.replace(/\/+$/, '')}/${DEFAULT_MODELS_DIR}`
  return {
    catalog: declared(env, MODEL_CATALOG_VAR) ?? `${base}/catalog.json`,
    qualifications: declared(env, MODEL_QUALIFICATIONS_VAR) ?? `${base}/qualifications.json`,
  }
}
