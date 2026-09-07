/**
 * Carga de especificaciones de autocompletado (Fig) por nombre de comando.
 *
 * Porte COMPLETO (actualizado — antes PARCIAL, ver historial de este
 * archivo). La fuente (`ccnmt: packages/shell/src/bash/registry.ts`)
 * declara `CommandSpec`/`Argument`/`Option`, `loadFigSpec` y
 * `getCommandSpec` (memoizado con LRU sobre la lista estática `specs` +
 * `loadFigSpec` como respaldo). Los cinco símbolos están presentes; el
 * respaldo de `getCommandSpec` usa `_memoizeWithLRU` de `./internal.js` y
 * el índice estático de `./specs/index.js`, ambos ya portados.
 *
 * @module
 */

import { _memoizeWithLRU as memoizeWithLRU } from './internal.js'
import specs from './specs/index.js'

export type CommandSpec = {
  name: string
  description?: string
  subcommands?: CommandSpec[]
  args?: Argument | Argument[]
  options?: Option[]
}

export type Argument = {
  name?: string
  description?: string
  isDangerous?: boolean
  isVariadic?: boolean
  isOptional?: boolean
  isCommand?: boolean
  isModule?: string | boolean
  isScript?: boolean
}

export type Option = {
  name: string | string[]
  description?: string
  args?: Argument | Argument[]
  isRequired?: boolean
}

/**
 * Carga la especificación Fig de `command` mediante import dinámico.
 *
 * Seguridad: esta función hace `await import(...\`${command}.js\`)`. Sin
 * validar la entrada, un `command` con separadores de ruta o `..` podría
 * cargar un módulo arbitrario del filesystem. Las cuatro comprobaciones de
 * abajo son la única defensa antes del import.
 */
export async function loadFigSpec(
  command: string,
  _signal?: AbortSignal,
): Promise<CommandSpec | null> {
  if (!command || command.includes('/') || command.includes('\\')) return null
  if (command.includes('..')) return null
  if (command.startsWith('-') && command !== '-') return null

  try {
    const module = await import(`@withfig/autocomplete/build/${command}.js`)
    return module.default || module
  } catch {
    return null
  }
}

/**
 * Resuelve la especificación de `command`: primero contra la lista
 * estática de `./specs/index.js` (comandos que envuelven a otro, como
 * `nohup`/`timeout`, y no tienen spec Fig propia publicada), y si no
 * aparece ahí, contra `loadFigSpec`. El resultado se memoiza con LRU por
 * nombre de comando.
 */
export const getCommandSpec = memoizeWithLRU(
  async (command: string): Promise<CommandSpec | null> => {
    const spec =
      specs.find(s => s.name === command) || (await loadFigSpec(command)) || null
    return spec
  },
  (command: string) => command,
)
