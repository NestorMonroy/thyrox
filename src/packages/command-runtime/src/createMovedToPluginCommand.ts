/**
 * Porte COMPLETO de `ccnmt: packages/command-runtime/src/createMovedToPluginCommand.ts`
 * — su unica exportacion (`createMovedToPluginCommand`), ninguna omitida.
 *
 * Divergencia declarada, ambas de tipo (nunca de comportamiento):
 * - `ContentBlockParam` se importa TYPE-ONLY de `@anthropic-ai/sdk`, igual
 *   que `./types.ts` ya hace en este paquete (ese archivo documenta por que
 *   un `import type` es seguro sin el paquete instalado: se elide al
 *   transpilar).
 * - `ToolUseContext` de `@claude-code-how-works/tool-registry` no existe en
 *   este arbol; el parametro `context` se tipa `unknown`, igual que
 *   `LocalJSXCommandContext` de `./types.ts` ya trata el contexto ajeno al
 *   comando (`[key: string]: unknown`). El cuerpo de la funcion nunca lee
 *   `context` — solo lo reenvia a `getPromptWhileMarketplaceIsPrivate` — asi
 *   que el tipo mas laxo no cambia ninguna rama observable.
 *
 * La cadena de texto de la rama `USER_TYPE === 'ant'` se reproduce VERBATIM:
 * es el contrato que `createMovedToPluginCommand.test.ts` verifica por
 * substring (nombre del plugin, comando y URL del README interpolados).
 */
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Command } from './types.js'

type Options = {
  name: string
  description: string
  progressMessage: string
  pluginName: string
  pluginCommand: string
  /**
   * El prompt a usar mientras el marketplace es privado.
   * Los usuarios externos reciben este prompt. Una vez que el marketplace
   * sea publico, este parametro y la logica de fallback pueden retirarse.
   */
  getPromptWhileMarketplaceIsPrivate: (
    args: string,
    context: unknown,
  ) => Promise<ContentBlockParam[]>
}

export function createMovedToPluginCommand({
  name,
  description,
  progressMessage,
  pluginName,
  pluginCommand,
  getPromptWhileMarketplaceIsPrivate,
}: Options): Command {
  return {
    type: 'prompt',
    name,
    description,
    progressMessage,
    contentLength: 0, // Contenido dinamico
    userFacingName() {
      return name
    },
    source: 'builtin',
    async getPromptForCommand(
      args: string,
      context: unknown,
    ): Promise<ContentBlockParam[]> {
      if (process.env.USER_TYPE === 'ant') {
        return [
          {
            type: 'text',
            text: `This command has been moved to a plugin. Tell the user:

1. To install the plugin, run:
   claude plugin install ${pluginName}@claude-code-how-works-marketplace

2. After installation, use /${pluginName}:${pluginCommand} to run this command

3. For more information, see: https://github.com/anthropics/claude-code-how-works-how-works-marketplace/blob/main/${pluginName}/README.md

Do not attempt to run the command. Simply inform the user about the plugin installation.`,
          },
        ]
      }

      return getPromptWhileMarketplaceIsPrivate(args, context)
    },
  } as Command
}
