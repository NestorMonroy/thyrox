/**
 * Puerto de `ccnmt: packages/teleport/src/environmentSelection.ts` (77
 * líneas fuente, 100% portado, con una divergencia de import declarada).
 *
 * Divergencia: la fuente lee `getSettings`/`getSettingsForSource` de
 * `config/settings`. En este árbol esos accesores viven en
 * `config/plugin/_deps.ts` como funciones inyectables (`_getSettings` /
 * `_getSettingsForSource`, con sus `setGetSettingsFn`/
 * `setGetSettingsForSourceFn` — patrón de dependencia invertida del host).
 * Se citan desde ahí; el comportamiento es el mismo una vez que el host
 * inyecta la implementación real.
 */

import { SETTING_SOURCES, type SettingSource } from '@thyrox/config/constants'
import {
  getSettings,
  getSettingsForSource,
} from '@thyrox/config/plugin/_deps.js'
import { type EnvironmentResource, fetchEnvironments } from './environments.js'

export type EnvironmentSelectionInfo = {
  availableEnvironments: EnvironmentResource[]
  selectedEnvironment: EnvironmentResource | null
  selectedEnvironmentSource: SettingSource | null
}

/**
 * Obtiene informacion sobre los entornos disponibles y el actualmente
 * seleccionado.
 *
 * @returns Promise<EnvironmentSelectionInfo> con:
 *   - availableEnvironments: todos los entornos de la API
 *   - selectedEnvironment: el entorno que se usaria (segun settings o el
 *     primero disponible), o null si no hay entornos disponibles
 *   - selectedEnvironmentSource: la SettingSource donde defaultEnvironmentId
 *     esta configurado, o null si se usa el default (primer entorno)
 */
export async function getEnvironmentSelectionInfo(): Promise<EnvironmentSelectionInfo> {
  // Obtiene los entornos disponibles
  const environments = await fetchEnvironments()

  if (environments.length === 0) {
    return {
      availableEnvironments: [],
      selectedEnvironment: null,
      selectedEnvironmentSource: null,
    }
  }

  // Obtiene los settings fusionados para ver que se usaria en realidad
  const mergedSettings = getSettings()
  const defaultEnvironmentId = (mergedSettings as { remote?: { defaultEnvironmentId?: string } } | undefined)
    ?.remote?.defaultEnvironmentId

  // Encuentra que entorno se seleccionaria
  let selectedEnvironment: EnvironmentResource =
    environments.find(env => env.kind !== 'bridge') ?? environments[0]!
  let selectedEnvironmentSource: SettingSource | null = null

  if (defaultEnvironmentId) {
    const matchingEnvironment = environments.find(
      env => env.environment_id === defaultEnvironmentId,
    )

    if (matchingEnvironment) {
      selectedEnvironment = matchingEnvironment

      // Encuentra cual fuente tiene este setting
      // Itera de menor a mayor prioridad, para que gane la ultima
      // coincidencia (mayor prioridad)
      for (let i = SETTING_SOURCES.length - 1; i >= 0; i--) {
        const source = SETTING_SOURCES[i]
        if (!source || source === 'flagSettings') {
          // Salta flagSettings — no es una fuente normal a chequear
          continue
        }
        const sourceSettings = getSettingsForSource(source) as
          | { remote?: { defaultEnvironmentId?: string } }
          | undefined
        if (
          sourceSettings?.remote?.defaultEnvironmentId === defaultEnvironmentId
        ) {
          selectedEnvironmentSource = source
          break
        }
      }
    }
  }

  return {
    availableEnvironments: environments,
    selectedEnvironment,
    selectedEnvironmentSource,
  }
}
