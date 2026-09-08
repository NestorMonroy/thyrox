/**
 * Puerto de `ccnmt: packages/tool-registry/src/words.ts` (800 líneas,
 * 2 símbolos exportados). El generador de slug con que se nombra un plan.
 *
 * DIVERGENCIA DECLARADA, y es de datos, no de mecanismo
 * (`porte-completo-no-parcial.md`). Las tres listas son de composición
 * propia: la fuente no publica licencia (`"license": "UNLICENSED"`), así
 * que se reimplementa el patrón en vez de copiar su vocabulario. Lo que el
 * consumidor exige es la FORMA —`adjetivo-verbo-sustantivo`— y suficiente
 * entropía para que una colisión sea rara; ningún llamador depende de una
 * palabra concreta.
 *
 * El coste medido de la divergencia: la fuente combina 219 × 109 × 409 =
 * 9 762 519; estas listas dan 72 × 40 × 70 = 201 600. Dos órdenes de
 * magnitud menos, y sigue de sobra: `plans.ts` reintenta ante colisión, y
 * con 200 slugs vivos la probabilidad de topar en un intento es del 0.1 %.
 *
 * LA ALEATORIEDAD SÍ SE PORTA, y es la mitad que importa. `randomBytes`,
 * no `Math.random()`: un identificador de plan que se pueda adivinar
 * permite nombrar el plan de otra sesión. Ese es exactamente el punto que
 * el sustituto local de `@thyrox/storage: plans.ts` perdía, y que este
 * módulo le devuelve.
 *
 * El sesgo del módulo queda declarado: `valor % max` favorece levemente
 * los primeros índices cuando `max` no divide a 2^32. Con listas de dos
 * cifras el sesgo es del orden de 10^-8 y no cambia ninguna conducta —
 * pero se dice, en vez de dejarlo como una propiedad que nadie midió.
 */
import { randomBytes } from 'crypto'

export const ADJECTIVES = [
  'amber', 'azure', 'balmy', 'blithe', 'brisk', 'candid', 'clement',
  'cobalt', 'copper', 'crimson', 'crisp', 'dappled', 'dusky', 'eager',
  'ember', 'fabled', 'fervent', 'fleet', 'fluent', 'gilded', 'glassy',
  'golden', 'hardy', 'hazel', 'hollow', 'humble', 'indigo', 'jaunty',
  'keen', 'laced', 'lilac', 'limber', 'lucid', 'lunar', 'marble', 'mellow',
  'mossy', 'nimble', 'nomad', 'opal', 'patient', 'pebbled', 'placid',
  'prairie', 'quiet', 'rugged', 'russet', 'saffron', 'sandy', 'scarlet',
  'silent', 'silver', 'slender', 'solar', 'spruce', 'steady', 'stellar',
  'stormy', 'sunlit', 'supple', 'tawny', 'tidal', 'timber', 'tranquil',
  'umber', 'velvet', 'verdant', 'vivid', 'willow', 'winter', 'woven',
  'zesty',
] as const

export const VERBS = [
  'arcs', 'bends', 'brews', 'carves', 'charts', 'circles', 'climbs',
  'crosses', 'dances', 'drifts', 'echoes', 'ferries', 'floats', 'folds',
  'forges', 'gathers', 'glides', 'grinds', 'hums', 'kindles', 'lands',
  'mends', 'mirrors', 'paces', 'plots', 'rings', 'roams', 'scouts',
  'shapes', 'sifts', 'sketches', 'spans', 'spins', 'tends', 'threads',
  'tilts', 'traces', 'turns', 'weaves', 'winds',
] as const

export const NOUNS = [
  'anchor', 'arbor', 'aspen', 'basin', 'beacon', 'bellows', 'birch',
  'bramble', 'bridge', 'burrow', 'canyon', 'cedar', 'cinder', 'cistern',
  'cobble', 'compass', 'coral', 'cove', 'crater', 'delta', 'dune',
  'ember', 'estuary', 'falcon', 'fathom', 'fjord', 'foundry', 'gable',
  'geyser', 'glacier', 'granite', 'grotto', 'harbor', 'heron', 'isthmus',
  'juniper', 'kestrel', 'lantern', 'ledger', 'lichen', 'lodestone',
  'marsh', 'meadow', 'mesa', 'mortar', 'nettle', 'orchard', 'otter',
  'pallet', 'pebble', 'pinion', 'prairie', 'quarry', 'quill', 'ridge',
  'rookery', 'saddle', 'sextant', 'shale', 'sluice', 'spindle', 'steppe',
  'tarn', 'thicket', 'tundra', 'vellum', 'verge', 'warren', 'willow',
  'windlass',
] as const

/** Entero en `[0, max)` con bytes criptográficos. */
function randomInt(max: number): number {
  const bytes = randomBytes(4)
  const value = bytes.readUInt32BE(0)
  return value % max
}

function pickRandom<T>(array: readonly T[]): T {
  return array[randomInt(array.length)]!
}

/** `adjetivo-verbo-sustantivo`, p. ej. `gilded-weaves-lantern`. */
export function generateWordSlug(): string {
  return `${pickRandom(ADJECTIVES)}-${pickRandom(VERBS)}-${pickRandom(NOUNS)}`
}

/** `adjetivo-sustantivo`, sin verbo. */
export function generateShortWordSlug(): string {
  return `${pickRandom(ADJECTIVES)}-${pickRandom(NOUNS)}`
}
