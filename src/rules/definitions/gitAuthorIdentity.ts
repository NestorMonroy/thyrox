import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RuleDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * La identidad de commit, abstracta.
 *
 * Es la primera regla portada al productor porque el clasificador la mide en
 * el peor de los cubos: cinco copias, tres de ellas SUBSUMIDAS por la de
 * `docs` — o sea, tres consumidores leyendo una version que se quedo atras de
 * la misma regla.
 *
 * Y es abstracta de verdad: las dos identidades son parametro del consumidor,
 * no del proveedor. THYROX construye kaupamex hoy y cualquier multi-repo
 * despues; una identidad literal en el productor lo ataria a un cliente.
 */
export const gitAuthorIdentity: RuleDefinition = {
  name: 'git-author-identity',
  scope: 'universal',
  parameters: [
    {
      name: 'author',
      envVar: 'THYROX_COMMIT_AUTHOR',
      description: 'la identidad humana que firma la autoria',
    },
    {
      name: 'committer',
      envVar: 'THYROX_COMMIT_COMMITTER',
      description: 'la identidad de servicio que registra el commit',
    },
  ],
  get body(): string {
    return readFileSync(join(HERE, 'gitAuthorIdentity.body.md'), 'utf8')
  },
}
