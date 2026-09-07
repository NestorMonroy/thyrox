/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/index.ts` — el
 * índice estático de specs Fig que `getCommandSpec` consulta antes de
 * intentar el import dinámico contra `@withfig/autocomplete`.
 */
import type { CommandSpec } from '../registry.js'
import alias from './alias.js'
import nohup from './nohup.js'
import pyright from './pyright.js'
import sleep from './sleep.js'
import srun from './srun.js'
import time from './time.js'
import timeout from './timeout.js'

export default [
  pyright,
  timeout,
  sleep,
  alias,
  nohup,
  time,
  srun,
] satisfies CommandSpec[]
