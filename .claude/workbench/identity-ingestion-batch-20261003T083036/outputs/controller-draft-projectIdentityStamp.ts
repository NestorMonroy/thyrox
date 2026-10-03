/**
 * La identidad del proyecto, estampada en la metadata de un documento antes de
 * ingerirlo.
 *
 * La evidencia conserva el nombre que existía cuando se escribió: el texto, el
 * id de dominio y la procedencia no cambian, y el hash de versión tampoco,
 * porque se calcula sólo sobre los chunks. Lo que se añade es la identidad
 * canónica y el nombre observado, para que una consulta por cualquiera de los
 * dos llegue a la misma evidencia.
 */
import { observedProjectOf, projectIdentityMetadata } from '@thyrox/project-identity/projectIdentity.ts'

import type { DocumentInput } from './corpus.ts'

/** El id de dominio nombra al proyecto con más autoridad que el texto, que puede citar a otro. */
function observedProjectOfDocument(input: DocumentInput): string | null {
  return observedProjectOf(input.domainId) ?? observedProjectOf(input.chunks.join('\n'))
}

export function stampProjectIdentity(input: DocumentInput): DocumentInput {
  return {
    ...input,
    metadata: { ...input.metadata, ...projectIdentityMetadata(observedProjectOfDocument(input)) },
  }
}
