/**
 * Porte de `ccnmt: packages/command-runtime/src/argumentSubstitution.ts`, que
 * en la fuente es a su vez un shim que reexporta de
 * `@claude-code-how-works/config/utils/argumentSubstitution.js` (para romper
 * un ciclo config -> command-runtime propio de ese arbol). Aqui no existe ese
 * ciclo ni ese paquete `config` consumidor, asi que la implementacion vive
 * directamente en este archivo en vez de como shim entre paquetes.
 *
 * DIVERGENCIA DE MECANISMO declarada en `parseArguments`: la fuente tokeniza
 * con la libreria `shell-quote`, alcanzada via
 * `@claude-code-how-works/shell/bash/shellQuote.ts::tryParseShellCommand`
 * (que a su vez depende de `shell-quote` npm, de `../errors.js` y de
 * `./internal.js` del paquete `shell`). Ese paquete `shell` no existe en este
 * arbol y esta fuera del alcance de este agente (command-runtime solamente).
 * En su lugar, este archivo implementa un tokenizador propio y minimo,
 * suficiente para el comportamiento que el test de este modulo ejercita:
 * division simple por espacios, comillas dobles y simples balanceadas, y
 * comillas escapadas (`\"`) dentro de una cadena entre comillas dobles. No
 * cubre el resto de la gramatica de shell-quote (operadores `;`/`&&`/`|`,
 * variables `$VAR`, glob, etc.) porque el modulo fuente ya filtra esos casos
 * a solo tokens de tipo string, y ningun caso de este test los ejercita.
 *
 * El resto de las funciones (`parseArgumentNames`,
 * `generateProgressiveArgumentHint`, `substituteArguments`) son autonomas en
 * la fuente y se portan verbatim en su logica.
 *
 * Sustituye placeholders `$ARGUMENTS` en prompts de skill/comando.
 *
 * Soporta:
 * - $ARGUMENTS - reemplazado con la cadena completa de argumentos
 * - $ARGUMENTS[0], $ARGUMENTS[1], etc. - reemplazado con argumentos indexados individuales
 * - $0, $1, etc. - abreviatura de $ARGUMENTS[0], $ARGUMENTS[1]
 * - Argumentos nombrados (p. ej. $foo, $bar) - cuando los nombres se declaran en el frontmatter
 */

/**
 * Tokenizador tipo shell, minimo y propio (ver divergencia arriba). Reconoce
 * comillas simples y dobles balanceadas, y `\"` / `\\` como escape dentro de
 * una cadena entre comillas dobles.
 */
function tokenizeShellLike(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let tokenStarted = false
  let inSingle = false
  let inDouble = false
  let i = 0

  while (i < input.length) {
    const ch = input[i]!

    if (inSingle) {
      if (ch === "'") {
        inSingle = false
      } else {
        current += ch
      }
      i++
      continue
    }

    if (inDouble) {
      if (ch === '\\' && (input[i + 1] === '"' || input[i + 1] === '\\')) {
        current += input[i + 1]
        i += 2
        continue
      }
      if (ch === '"') {
        inDouble = false
        i++
        continue
      }
      current += ch
      i++
      continue
    }

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      if (tokenStarted) {
        tokens.push(current)
        current = ''
        tokenStarted = false
      }
      i++
      continue
    }

    if (ch === "'") {
      inSingle = true
      tokenStarted = true
      i++
      continue
    }

    if (ch === '"') {
      inDouble = true
      tokenStarted = true
      i++
      continue
    }

    current += ch
    tokenStarted = true
    i++
  }

  if (tokenStarted) tokens.push(current)
  return tokens
}

/**
 * Parsea una cadena de argumentos en un arreglo de argumentos individuales.
 * Usa un tokenizador tipo shell para el parseo correcto, incluyendo cadenas
 * entre comillas.
 *
 * Ejemplos:
 * - "foo bar baz" => ["foo", "bar", "baz"]
 * - 'foo "hello world" baz' => ["foo", "hello world", "baz"]
 * - "foo 'hello world' baz" => ["foo", "hello world", "baz"]
 */
export function parseArguments(args: string): string[] {
  if (!args || !args.trim()) {
    return []
  }

  return tokenizeShellLike(args)
}

/**
 * Parsea nombres de argumento desde el campo 'arguments' del frontmatter.
 * Acepta una cadena separada por espacios o un arreglo de cadenas.
 *
 * Ejemplos:
 * - "foo bar baz" => ["foo", "bar", "baz"]
 * - ["foo", "bar", "baz"] => ["foo", "bar", "baz"]
 */
export function parseArgumentNames(
  argumentNames: string | string[] | undefined,
): string[] {
  if (!argumentNames) {
    return []
  }

  // Filtra cadenas vacias y nombres solo numericos (que chocan con $0, $1)
  const isValidName = (name: string): boolean =>
    typeof name === 'string' && name.trim() !== '' && !/^\d+$/.test(name)

  if (Array.isArray(argumentNames)) {
    return argumentNames.filter(isValidName)
  }
  if (typeof argumentNames === 'string') {
    return argumentNames.split(/\s+/).filter(isValidName)
  }
  return []
}

/**
 * Genera el hint de argumento mostrando los args restantes sin llenar.
 * @param argNames - Arreglo de nombres de argumento desde el frontmatter
 * @param typedArgs - Argumentos que la persona ya tecleo
 * @returns Cadena de hint tipo "[arg2] [arg3]", o undefined si todos estan llenos
 */
export function generateProgressiveArgumentHint(
  argNames: string[],
  typedArgs: string[],
): string | undefined {
  const remaining = argNames.slice(typedArgs.length)
  if (remaining.length === 0) return undefined
  return remaining.map(name => `[${name}]`).join(' ')
}

/**
 * Sustituye placeholders $ARGUMENTS en el contenido con los valores reales
 * de los argumentos.
 *
 * @param content - El contenido que contiene los placeholders
 * @param args - La cadena cruda de argumentos (puede ser undefined/null)
 * @param appendIfNoPlaceholder - Si es true y no se encuentran placeholders, apendiza "ARGUMENTS: {args}" al contenido
 * @param argumentNames - Arreglo opcional de argumentos nombrados (p. ej. ["foo", "bar"]) que mapean a posiciones indexadas
 * @returns El contenido con los placeholders sustituidos
 */
export function substituteArguments(
  content: string,
  args: string | undefined,
  appendIfNoPlaceholder = true,
  argumentNames: string[] = [],
): string {
  // undefined/null significa que no se dieron args - retorna el contenido sin cambios
  // cadena vacia es una entrada valida que debe reemplazar placeholders con vacio
  if (args === undefined || args === null) {
    return content
  }

  const parsedArgs = parseArguments(args)
  const originalContent = content

  // Reemplaza argumentos nombrados (p. ej. $foo, $bar) con sus valores
  // Los argumentos nombrados mapean a posiciones: argumentNames[0] -> parsedArgs[0], etc.
  for (let i = 0; i < argumentNames.length; i++) {
    const name = argumentNames[i]
    if (!name) continue

    // Empareja $name pero no $name[...] ni $nameXxx (caracteres de palabra)
    // Ademas asegura limites de palabra para evitar coincidencias parciales
    content = content.replace(
      new RegExp(`\\$${name}(?![\\[\\w])`, 'g'),
      parsedArgs[i] ?? '',
    )
  }

  // Reemplaza argumentos indexados ($ARGUMENTS[0], $ARGUMENTS[1], etc.)
  content = content.replace(/\$ARGUMENTS\[(\d+)\]/g, (_, indexStr: string) => {
    const index = parseInt(indexStr, 10)
    return parsedArgs[index] ?? ''
  })

  // Reemplaza argumentos indexados abreviados ($0, $1, etc.)
  content = content.replace(/\$(\d+)(?!\w)/g, (_, indexStr: string) => {
    const index = parseInt(indexStr, 10)
    return parsedArgs[index] ?? ''
  })

  // Reemplaza $ARGUMENTS con la cadena completa de argumentos
  content = content.replaceAll('$ARGUMENTS', args)

  // Si no se encontraron placeholders y appendIfNoPlaceholder es true, apendiza
  // Pero solo si args es no-vacio (cadena vacia significa comando invocado sin args)
  if (content === originalContent && appendIfNoPlaceholder && args) {
    content = content + `\n\nARGUMENTS: ${args}`
  }

  return content
}
