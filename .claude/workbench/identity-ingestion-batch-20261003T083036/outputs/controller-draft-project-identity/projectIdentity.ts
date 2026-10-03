/**
 * La identidad del proyecto: el ecosistema, el nombre canónico y los nombres
 * legacy con que se escribió la evidencia anterior.
 *
 * La evidencia histórica es inmutable: un log, un hallazgo o una etiqueta OCI
 * conservan el nombre que existía cuando ocurrió el evento. La identidad
 * canónica no reescribe ese contenido; viaja como metadata junto a él, y así
 * una consulta por el nombre canónico o por uno legacy llega a la misma
 * evidencia.
 */

export type ProjectIdentity = {
  readonly ecosystem: string
  readonly canonicalProject: string
  readonly legacyProjects: readonly string[]
}

/** La metadata con que se normaliza un registro, en las claves del corpus. */
export type ProjectIdentityMetadata = {
  readonly ecosystem: string
  readonly canonical_project: string
  readonly legacy_projects: readonly string[]
  readonly observed_project: string | null
}

export const PROJECT_IDENTITY: ProjectIdentity = Object.freeze({
  ecosystem: 'kaupamex',
  canonicalProject: 'kaupamex-ai',
  legacyProjects: Object.freeze(['thyrox']),
})

function escapeForPattern(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Un nombre cuenta sólo cuando no está pegado a otra letra o dígito: así
 * `TASK-THYROX-0710`, `.thyrox/` o `THYROX_*` lo nombran, y una palabra que
 * sólo contiene la secuencia no.
 */
function projectNamePattern(identity: ProjectIdentity): RegExp {
  const names = [identity.canonicalProject, ...identity.legacyProjects]
    .sort((left, right) => right.length - left.length)
    .map(escapeForPattern)
  return new RegExp(`(?<![a-z0-9])(${names.join('|')})(?![a-z0-9])`, 'i')
}

/**
 * El nombre de proyecto que usó la fuente, el primero que aparece en su texto,
 * o `null` si no nombra ninguno.
 */
export function observedProjectOf(text: string, identity: ProjectIdentity = PROJECT_IDENTITY): string | null {
  const match = projectNamePattern(identity).exec(text)
  return match ? match[1].toLowerCase() : null
}

export function projectIdentityMetadata(
  observedProject: string | null,
  identity: ProjectIdentity = PROJECT_IDENTITY,
): ProjectIdentityMetadata {
  return {
    ecosystem: identity.ecosystem,
    canonical_project: identity.canonicalProject,
    legacy_projects: [...identity.legacyProjects],
    observed_project: observedProject,
  }
}
