/**
 * De dónde sale la credencial de una conexión: de una variable de entorno
 * nombrada, de stdin o de un prompt oculto, nunca de un argumento. Un
 * argumento queda en el historial del shell y a la vista de `ps`; por eso
 * `--credential <valor>`, que la referencia admite con una advertencia, aquí
 * se rehúsa.
 *
 * Porte de `resolveProviderCredential` en
 * `omniroute: bin/cli/commands/provider-crud.mjs` (MIT).
 */
import { flag, hasFlag } from '../../entry/flags.ts'

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

export const CREDENTIAL_ARGUMENT_REFUSED =
  '--credential is not accepted: a secret on the command line stays in shell history and in ps. Use --credential-stdin or --credential-env.'

export interface CredentialSources {
  env: Record<string, string | undefined>
  readStdin: () => Promise<string>
  /** Sólo se pregunta con una terminal delante. */
  interactive: boolean
  promptSecret: (question: string) => Promise<string>
}

export function passesCredentialAsArgument(args: string[]): boolean {
  return hasFlag(args, 'credential')
}

/** La credencial de la invocación, o `undefined` si no hay fuente y no se pregunta. */
export async function resolveCredential(args: string[], sources: CredentialSources, options: { prompt: boolean }): Promise<string | undefined> {
  const envName = flag(args, 'credential-env')?.trim()
  if (envName) {
    if (!ENV_NAME.test(envName)) throw new Error('--credential-env must be a valid env name.')
    const value = sources.env[envName]?.trim()
    if (!value) throw new Error(`Environment variable ${envName} is empty or unset.`)
    return value
  }
  if (hasFlag(args, 'credential-stdin')) {
    const value = (await sources.readStdin()).trim()
    if (!value) throw new Error('Credential stdin was empty.')
    return value
  }
  if (!options.prompt || !sources.interactive) return undefined
  const value = (await sources.promptSecret('Provider credential (hidden): ')).trim()
  if (!value) throw new Error('Provider credential is required.')
  return value
}
