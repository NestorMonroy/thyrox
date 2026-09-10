/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/srun.ts` — spec Fig
 * del comando `srun` (ejecuta un comando en nodos de un clúster SLURM).
 */
import type { CommandSpec } from '../registry.js'

const srun: CommandSpec = {
  name: 'srun',
  description: 'Ejecutar un comando en nodos de un clúster SLURM',
  options: [
    {
      name: ['-n', '--ntasks'],
      description: 'Número de tareas',
      args: {
        name: 'count',
        description: 'Número de tareas a ejecutar',
      },
    },
    {
      name: ['-N', '--nodes'],
      description: 'Número de nodos',
      args: {
        name: 'count',
        description: 'Número de nodos a asignar',
      },
    },
  ],
  args: {
    name: 'command',
    description: 'Comando a ejecutar en el clúster',
    isCommand: true,
  },
}

export default srun
