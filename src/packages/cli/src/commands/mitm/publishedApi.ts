/**
 * La API que sirve `thyrox mitm serve`, para los verbos que necesitan a su
 * dueño: el servidor MITM que arrancó o el búfer de tráfico que llena. Sin
 * una URL publicada no hay a quién hablar.
 */
import { usage, type UsageError } from './verbResult.ts'

export interface PublishedApiDeps {
  /** La URL de la API en marcha, o `null` si no hay ninguna. */
  apiUrl: () => string | null
}

export function publishedApiUrl(deps: PublishedApiDeps): string | UsageError {
  return deps.apiUrl() ?? usage('no MITM API is running; start it with thyrox mitm serve')
}
