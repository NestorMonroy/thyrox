/**
 * Dónde crea el runtime las unidades, derivado de lo que el runtime informa
 * (H-THYROX-471). La RAM de una unidad de Podman no se carga al cgroup de la
 * sesión que la pide sino al padre de su `CgroupPath`; admitir contra el de la
 * sesión mide otra frontera —medido aquí: la sesión con 14.3 GB de límite, las
 * unidades bajo un padre sin límite—.
 *
 * La ubicación es el padre del cgroup de las unidades de modelo vivas; sin
 * ninguna, el de los demás contenedores vivos, que la primitiva crea con la
 * misma política de cgroups; sin contenedor alguno, la raíz.
 *
 * Ciega a: un límite en el padre de una unidad que aún no existe cuando no
 * hay ningún contenedor vivo que observar —la raíz sólo acota por el
 * anfitrión—, y a un `--cgroup-parent` distinto para la unidad que se crea.
 */
import { posix } from 'node:path'

import { EXECUTION_KIND_LABEL_KEY } from '@thyrox/podman-execution/executionAuthorization.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { listContainers, type ObservedContainer } from '@thyrox/podman-execution/podmanObservation.ts'

const MODEL_RUNTIME_KIND = 'model-runtime'
const ROOT_PLACEMENT = '/'

/** La ubicación del destino, o un error si no se pudo derivar. */
export type UnitPlacement = () => Promise<string>

export class AmbiguousPlacementError extends Error {
  constructor(parents: readonly string[]) {
    super(`las unidades viven bajo padres distintos (${parents.join(', ')}): ninguno es la frontera de la siguiente`)
  }
}

function parentsOf(containers: readonly ObservedContainer[]): string[] {
  return [...new Set(containers.filter(c => c.running && c.cgroup !== '').map(c => posix.dirname(c.cgroup)))]
}

export function unitPlacementOf(containers: readonly ObservedContainer[]): string {
  const units = parentsOf(containers.filter(c => c.labels[EXECUTION_KIND_LABEL_KEY] === MODEL_RUNTIME_KIND))
  const parents = units.length > 0 ? units : parentsOf(containers)
  if (parents.length > 1) throw new AmbiguousPlacementError(parents)
  return parents[0] ?? ROOT_PLACEMENT
}

export function observedUnitPlacement(podman: PodmanExecutor): UnitPlacement {
  return async () => unitPlacementOf(await listContainers(podman))
}
