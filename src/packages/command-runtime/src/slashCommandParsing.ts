/**
 * Porte COMPLETO de `ccnmt: packages/command-runtime/src/slashCommandParsing.ts`
 * — sus dos exportaciones, ninguna omitida. El archivo fuente no importa nada
 * fuera de si mismo, asi que este porte no arrastra ninguna dependencia.
 *
 * Utilidades centralizadas para el parseo de slash commands.
 */

export type ParsedSlashCommand = {
  commandName: string
  args: string
  isMcp: boolean
}

export type ParsedStackedSlashCommands = {
  commandNames: string[]
  args: string
}

/** Parsea de dos a cinco tokens `/skill` iniciales. Un solo comando se queda
 * en el camino normal de slash command, y el primer token que no es comando
 * empieza la tarea. */
export function parseStackedSlashCommands(
  input: string,
): ParsedStackedSlashCommands | null {
  const words = input.trim().split(/\s+/)
  const commandNames: string[] = []
  let index = 0
  while (
    index < words.length &&
    commandNames.length < 5 &&
    /^\/[A-Za-z0-9_.:@-]+$/.test(words[index] ?? '')
  ) {
    commandNames.push(words[index]!.slice(1))
    index++
  }
  if (commandNames.length < 2) return null
  return { commandNames, args: words.slice(index).join(' ') }
}

/**
 * Parsea una cadena de entrada de slash command en sus partes componentes.
 *
 * @param input - La cadena cruda de entrada (debe empezar con '/')
 * @returns Nombre de comando, args y bandera MCP parseados, o null si es invalida
 *
 * @example
 * parseSlashCommand('/search foo bar')
 * // => { commandName: 'search', args: 'foo bar', isMcp: false }
 *
 * @example
 * parseSlashCommand('/mcp:tool (MCP) arg1 arg2')
 * // => { commandName: 'mcp:tool (MCP)', args: 'arg1 arg2', isMcp: true }
 */
export function parseSlashCommand(input: string): ParsedSlashCommand | null {
  const trimmedInput = input.trim()

  // Verifica que la entrada empiece con '/'
  if (!trimmedInput.startsWith('/')) {
    return null
  }

  // Retira el '/' inicial y divide por espacios
  const withoutSlash = trimmedInput.slice(1)
  const words = withoutSlash.split(' ')

  if (!words[0]) {
    return null
  }

  let commandName = words[0]
  let isMcp = false
  let argsStartIndex = 1

  // Verifica comandos MCP (la segunda palabra es '(MCP)')
  if (words.length > 1 && words[1] === '(MCP)') {
    commandName = commandName + ' (MCP)'
    isMcp = true
    argsStartIndex = 2
  }

  // Extrae los argumentos (todo despues del nombre de comando)
  const args = words.slice(argsStartIndex).join(' ')

  return {
    commandName,
    args,
    isMcp,
  }
}
