/**
 * Puerto de `ccnmt: packages/local-observability/src/logging/internal.ts`
 * (83 líneas fuente, 100 % portado). `logPermissionContextForAnts` +
 * sondas de namespace k8s/container. Emite eventos de sólo-analítica para
 * usuarios ant-internos; no-op para el resto. Sin dependencias de
 * paquete hermano.
 */

import { readFile } from 'fs/promises'
import memoize from 'lodash-es/memoize.js'

import { logEvent } from '../index.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../compat.js'
import { jsonStringify } from '../slowOperations.js'

/**
 * Obtiene el namespace de Kubernetes actual:
 * `null` en laptops/desarrollo local, `"default"` para devboxes en el
 * namespace default, `"ts"` para devboxes en el namespace ts, …
 */
const getKubernetesNamespace = memoize(async (): Promise<string | null> => {
  if (process.env.USER_TYPE !== 'ant') return null
  const namespacePath =
    '/var/run/secrets/kubernetes.io/serviceaccount/namespace'
  try {
    const content = await readFile(namespacePath, { encoding: 'utf8' })
    return content.trim()
  } catch {
    return 'namespace not found'
  }
})

/** Obtiene el ID de contenedor OCI desde dentro de un contenedor en ejecución. */
export const getContainerId = memoize(async (): Promise<string | null> => {
  if (process.env.USER_TYPE !== 'ant') return null
  const containerIdPath = '/proc/self/mountinfo'
  try {
    const mountinfo = (
      await readFile(containerIdPath, { encoding: 'utf8' })
    ).trim()

    const containerIdPattern =
      /(?:\/docker\/containers\/|\/sandboxes\/)([0-9a-f]{64})/

    const lines = mountinfo.split('\n')
    for (const line of lines) {
      const match = line.match(containerIdPattern)
      if (match && match[1]) return match[1]
    }
    return 'container ID not found in mountinfo'
  } catch {
    return 'container ID not found'
  }
})

/**
 * Loguea un evento con el namespace y el contexto de permisos de
 * herramienta actuales.
 *
 * Acepta `unknown` para `toolPermissionContext` porque el tipo concreto
 * vive en `@thyrox/permission` y no se cruza hacia arriba desde
 * local-observability. Cada llamador pasa el contexto de permiso que
 * tenga a mano.
 */
export async function logPermissionContextForAnts(
  toolPermissionContext: unknown,
  moment: 'summary' | 'initialization',
): Promise<void> {
  if (process.env.USER_TYPE !== 'ant') return

  void logEvent('tengu_internal_record_permission_context', {
    moment:
      moment as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    namespace:
      (await getKubernetesNamespace()) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    toolPermissionContext: jsonStringify(
      toolPermissionContext,
    ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    containerId:
      (await getContainerId()) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
}
