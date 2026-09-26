/**
 * El programa al que se cuelgan subcomandos (`mcp`, `auth`, `project`…).
 *
 * Quien registra un subcomando sólo llama a `.command(…)` sobre él; no lee su
 * argumento posicional ni sus opciones. Con `Command` a secas el parámetro
 * exige `Command<[], {}>`, y el programa principal —que tipa su `[prompt]` y
 * cada opción— no cabe. Con los genéricos abiertos, cualquier programa cabe.
 */
import type { Command, OptionValues } from '@commander-js/extra-typings'

export type ParentCommand = Command<unknown[], OptionValues>
