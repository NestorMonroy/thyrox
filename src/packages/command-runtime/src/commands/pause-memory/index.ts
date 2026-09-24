/**
 * `/pause-memory` — porte de 2.1.281 (`fOo`, `chunk-4n4g22z6.js`). La
 * metadata se copia tal cual, incluido `isEnabled: () => false`: en esa
 * versión el comando está declarado pero apagado, y el porte conserva ese
 * estado en vez de encenderlo por su cuenta.
 */
import type { Command } from '../../runtime.js'

const pauseMemory = {
  type: 'local',
  name: 'pause-memory',
  aliases: ['memory-pause', 'toggle-memory'],
  description: 'Pause automemory for this session',
  isEnabled: () => false,
  isHidden: false,
  supportsNonInteractive: true,
  load: () => import('./pauseMemory.js'),
  userFacingName() {
    return 'pause-memory'
  },
} satisfies Command

export default pauseMemory
