/**
 * El puerto con que un reconciliador deja un modelo instalado en un runtime
 * (TASK-THYROX-0729). El dominio dice «instala este modelo contractual desde
 * este GGUF verificado, con este digest»; cómo lo hace un runtime concreto
 * (en Ollama, `/api/blobs` y `/api/create`) vive sólo en su adapter.
 *
 * `inspect` devuelve el CONTENIDO que el runtime tiene bajo el nombre, no su
 * presencia: un nombre listado con otro blob no es el modelo pedido.
 */

/** Lo que el runtime sirve hoy bajo un nombre contractual. */
export interface InstalledModelState {
  readonly name: string
  /** sha256 (64 hex) del blob GGUF que el runtime resuelve para el nombre. */
  readonly contentSha256: string
}

export interface ModelInstallRequest {
  /** Nombre contractual del catálogo. */
  readonly name: string
  /** GGUF verificado en la caché local. */
  readonly artifactPath: string
  /** sha256 (64 hex) que el runtime tiene que guardar. */
  readonly contentSha256: string
}

export type InstallOutcome =
  | { readonly status: 'installed' }
  | { readonly status: 'failed'; readonly reason: string }

export interface ModelInstaller {
  /** `undefined` si el runtime no resuelve el nombre. */
  inspect(name: string): Promise<InstalledModelState | undefined>
  install(request: ModelInstallRequest): Promise<InstallOutcome>
}
