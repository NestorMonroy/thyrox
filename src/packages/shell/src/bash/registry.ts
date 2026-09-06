/**
 * Carga de especificaciones de autocompletado (Fig) por nombre de comando.
 *
 * PORTE PARCIAL. La fuente (`claude-code-nestor-monroy-tools:
 * packages/shell/src/bash/registry.ts`) declara `CommandSpec`/`Argument`/
 * `Option`, `loadFigSpec` y `getCommandSpec` (memoizado con LRU sobre una
 * lista interna `specs` + `loadFigSpec`). El test portado
 * (`loadFigSpec.test.ts`) sólo ejercita `loadFigSpec` — la validación de
 * entrada contra path traversal / flags. Se portan los tres tipos porque
 * son la firma de `loadFigSpec`; se OMITE `getCommandSpec` (y con él
 * `_memoizeWithLRU` de `./internal.js` y el índice `./specs/index.js`,
 * ninguno de los dos existe en este paquete) por no estar ejercitado.
 *
 * @module
 */

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
