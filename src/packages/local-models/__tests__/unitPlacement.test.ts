/**
 * La ubicación de las unidades se deriva de lo que el runtime informa
 * (H-THYROX-471): el padre del `CgroupPath` de las unidades vivas, nunca una
 * ruta escrita a mano ni el cgroup de la sesión que pregunta.
 */
import { describe, expect, test } from 'bun:test'

import type { ObservedContainer } from '@thyrox/podman-execution/podmanObservation.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { AmbiguousPlacementError, observedUnitPlacement, unitPlacementOf } from '../unitPlacement.ts'

function container(name: string, cgroup: string, labels: Record<string, string> = {}, running = true): ObservedContainer {
  return { id: name, name, state: running ? 'running' : 'exited', running, pid: running ? 1 : 0, imageId: '', image: '',
    created: '', labels, mounts: [], portBindings: {}, cgroup }
}

const MODEL = { 'thyrox.execution-kind': 'model-runtime' }

describe('unitPlacementOf', () => {
  test('es el padre del cgroup de las unidades de modelo vivas', () => {
    expect(unitPlacementOf([
      container('pg', '/infra_parent/libpod-a'),
      container('unit', '/units_parent/libpod-b', MODEL),
    ])).toBe('/units_parent')
  })

  test('sin unidad de modelo viva, el de los demás contenedores del mismo runtime', () => {
    expect(unitPlacementOf([container('pg', '/libpod_parent/libpod-a'), container('dead', '/x/libpod-c', MODEL, false)]))
      .toBe('/libpod_parent')
  })

  test('sin ningún contenedor observado, la raíz: sólo el anfitrión acota', () => {
    expect(unitPlacementOf([])).toBe('/')
  })

  test('dos padres distintos entre las unidades no se resuelven eligiendo uno', () => {
    expect(() => unitPlacementOf([container('a', '/p1/libpod-a', MODEL), container('b', '/p2/libpod-b', MODEL)]))
      .toThrow(AmbiguousPlacementError)
  })
})

describe('observedUnitPlacement', () => {
  test('lee los contenedores por la observación de la primitiva', async () => {
    const calls: string[][] = []
    const podman: PodmanExecutor = {
      run: async (args: readonly string[]) => {
        calls.push([...args])
        if (args[0] === 'ps') return { exitCode: 0, stdout: 'u1\n', stderr: '' }
        return { exitCode: 0, stdout: JSON.stringify([{ Id: 'u1', Name: 'unit', State: { Running: true, Pid: 7, CgroupPath: '/units_parent/libpod-u1' }, Config: { Labels: MODEL } }]), stderr: '' }
      },
    } as unknown as PodmanExecutor
    expect(await observedUnitPlacement(podman)()).toBe('/units_parent')
    expect(calls[0]?.[0]).toBe('ps')
  })
})
