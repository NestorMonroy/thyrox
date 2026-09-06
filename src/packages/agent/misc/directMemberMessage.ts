/**
 * Porte PARCIAL de `ccnmt: packages/agent/misc/directMemberMessage.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente tipa `teamContext` como
 * `AppState['teamContext']` (`@claude-code-how-works/app-host/state/
 * AppState.js`), que no vive en este arbol. El propio test de origen
 * pasa siempre `as never` a ese parametro, asi que el contrato real que
 * se ejercita es estructural: un objeto con `teammates` (mapa opcional de
 * `{ name: string }`, indexado por una clave arbitraria que el codigo
 * ignora) y `teamName` (string). Se declara aqui un tipo local minimo con
 * esa forma en vez de portar `AppState` completo.
 */

type TeamContextLike = {
  teammates?: Record<string, { name: string }>
  teamName: string
}

/**
 * Interpreta la sintaxis `@nombre-agente mensaje` para mensajeria directa
 * entre miembros del equipo.
 */
export function parseDirectMemberMessage(input: string): {
  recipientName: string
  message: string
} | null {
  const match = input.match(/^@([\w-]+)\s+(.+)$/s)
  if (!match) return null

  const [, recipientName, message] = match
  if (!recipientName || !message) return null

  const trimmedMessage = message.trim()
  if (!trimmedMessage) return null

  return { recipientName, message: trimmedMessage }
}

export type DirectMessageResult =
  | { success: true; recipientName: string }
  | {
      success: false
      error: 'no_team_context' | 'unknown_recipient'
      recipientName?: string
    }

type WriteToMailboxFn = (
  recipientName: string,
  message: { from: string; text: string; timestamp: string },
  teamName: string,
) => Promise<void>

/**
 * Envia un mensaje directo a un miembro del equipo, sin pasar por el
 * modelo.
 */
export async function sendDirectMemberMessage(
  recipientName: string,
  message: string,
  teamContext: TeamContextLike,
  writeToMailbox?: WriteToMailboxFn,
): Promise<DirectMessageResult> {
  if (!teamContext || !writeToMailbox) {
    return { success: false, error: 'no_team_context' }
  }

  // Busca al miembro del equipo por nombre.
  const member = Object.values(teamContext.teammates ?? {}).find(
    t => t.name === recipientName,
  )

  if (!member) {
    return { success: false, error: 'unknown_recipient', recipientName }
  }

  await writeToMailbox(
    recipientName,
    {
      from: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    },
    teamContext.teamName,
  )

  return { success: true, recipientName }
}
