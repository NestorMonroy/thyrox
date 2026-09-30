/**
 *
 *
 *
 */


export type CommandPrefixResult = {
  commandPrefix: string | null
}

export type CommandSubcommandPrefixResult = CommandPrefixResult & {
  subcommandPrefixes: Map<string, CommandPrefixResult>
}

type PrefixExtractorConfig = {
  toolName: string
  policySpec: string
  eventName: string
  querySource: string
  preCheck?: (command: string) => CommandPrefixResult | null
}


/**
 */
export function createCommandPrefixExtractor(
  _config: PrefixExtractorConfig,
): ((
  command: string,
  abortSignal: AbortSignal,
  isNonInteractiveSession: boolean,
) => Promise<CommandPrefixResult | null>) & { cache: Map<string, unknown> } {
  const cache = new Map<string, unknown>()

  const fn = async (
    _command: string,
    _abortSignal?: AbortSignal,
    _isNonInteractiveSession?: boolean,
  ): Promise<CommandPrefixResult | null> => {
    return null
  }

  fn.cache = cache
  return fn
}

/**
 */
export function createSubcommandPrefixExtractor(
  _getPrefix: (
    command: string,
    abortSignal: AbortSignal,
    isNonInteractiveSession: boolean,
  ) => Promise<CommandPrefixResult | null>,
  _splitCommand: (command: string) => string[] | Promise<string[]>,
): ((
  command: string,
  abortSignal: AbortSignal,
  isNonInteractiveSession: boolean,
) => Promise<CommandSubcommandPrefixResult | null>) & { cache: Map<string, unknown> } {
  const cache = new Map<string, unknown>()

  const fn = async (
    _command: string,
    _abortSignal?: AbortSignal,
    _isNonInteractiveSession?: boolean,
  ): Promise<CommandSubcommandPrefixResult | null> => {
    return null
  }

  fn.cache = cache
  return fn
}
