/**
 * Puerto de `ccnmt: packages/config/utils/envExpansion.ts` (43 líneas
 * fuente). Sin dependencias — sólo `process.env` y `String.replace`.
 * Reimplementación fiel.
 *
 * Expande variables de entorno en un valor de cadena de una config MCP,
 * con la sintaxis `${VAR}` y `${VAR:-default}`.
 */

/**
 * Expande variables de entorno en un valor de cadena.
 * Soporta la sintaxis `${VAR}` y `${VAR:-default}`.
 * @returns objeto con la cadena expandida y la lista de variables ausentes
 */
export function expandEnvVarsInString(value: string): {
  expanded: string
  missingVars: string[]
} {
  const missingVars: string[] = []

  const expanded = value.replace(/\$\{([^}]+)\}/g, (match, varContent) => {
    // Se busca el PRIMER `:-` y se parte ahí. Un `split(':-', 2)` ingenuo
    // descarta todo lo que va después del segundo elemento, así que
    // `${A:-foo:-bar}` perdería `:-bar` del default. `indexOf` + `slice`
    // conservan el resto verbatim.
    const sepIdx = varContent.indexOf(':-')
    const varName = sepIdx === -1 ? varContent : varContent.slice(0, sepIdx)
    const defaultValue =
      sepIdx === -1 ? undefined : varContent.slice(sepIdx + 2)
    const envValue = process.env[varName]

    if (envValue !== undefined) {
      return envValue
    }
    if (defaultValue !== undefined) {
      return defaultValue
    }

    // Registra la variable ausente para reportar el error.
    // Devuelve el original si no se encontró (permite depurar y se
    // reportará como error).
    missingVars.push(varName)
    return match
  })

  return {
    expanded,
    missingVars,
  }
}
