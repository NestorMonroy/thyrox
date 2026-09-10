/**
 * Errores tipados del dominio swarm — porte de
 * `ccnmt: packages/swarm/src/errors.ts`.
 *
 * Porte VERBATIM: el archivo fuente no tiene ninguna dependencia externa
 * (ni de `adapters/appRuntime.ts` ni de ningún hermano), así que no hay
 * divergencia que declarar. Los cuatro `code` (`SWARM_*`) y los cuatro
 * `name` (`Swarm*Error`) se preservan tal cual — son el identificador de
 * wire-protocol que la telemetría y el log-scraping consumen aguas abajo.
 */

export class SwarmBaseError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SwarmBaseError'
    this.code = code
  }
}

export class SpawnError extends SwarmBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('SWARM_SPAWN_ERROR', message, options)
    this.name = 'SwarmSpawnError'
  }
}

export class MailboxError extends SwarmBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('SWARM_MAILBOX_ERROR', message, options)
    this.name = 'SwarmMailboxError'
  }
}

export class WorktreeError extends SwarmBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('SWARM_WORKTREE_ERROR', message, options)
    this.name = 'SwarmWorktreeError'
  }
}
