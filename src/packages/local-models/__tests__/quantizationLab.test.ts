import { describe, expect, test } from 'bun:test'

import {
  EXECUTION_ID_LABEL_KEY,
  EXECUTION_KIND_LABEL_KEY,
  EXECUTION_REFERENCE_LABEL_KEY,
} from '@thyrox/podman-execution/executionAuthorization.ts'
import type { PodmanCommandResult, PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { QuantizationLab } from '../quantizationLab.js'

function fakePodman(): PodmanExecutor & { readonly calls: string[][] } {
  const calls: string[][] = []
  const responses: Record<string, PodmanCommandResult> = {
    wait: { exitCode: 0, stdout: '0\n', stderr: '' },
    logs: { exitCode: 0, stdout: 'text', stderr: 'speed: 3 t/s' },
  }
  return {
    calls,
    async run(args) {
      calls.push([...args])
      return responses[args[0]!] ?? { exitCode: 0, stdout: '', stderr: '' }
    },
  }
}

const LIMITS = { memoryBytes: 8 * 1024 ** 3, cpus: 4 }
const OWNER = { id: 'quantize-run', pid: 4321 }

describe('quantization lab', () => {
  test('runs a step through the podman execution primitive, never podman run', async () => {
    const podman = fakePodman()
    const lab = new QuantizationLab(podman, 'image-id', '/scratch-host', LIMITS, async () => undefined, OWNER)
    const result = await lab.run({ workerId: 'quantize-run', command: ['llama-simple', '-m', '/scratch/m.gguf'] })
    expect(result).toMatchObject({ exitCode: 0, stdout: 'text', stderr: 'speed: 3 t/s', containerName: 'thyrox-worker-quantize-run' })
    expect(podman.calls.map(call => call[0])).toEqual(['create', 'start', 'wait', 'logs', 'rm'])
  })

  test('declares the lab owner, no network, the memory limit and the scratch mount', async () => {
    const podman = fakePodman()
    const lab = new QuantizationLab(podman, 'image-id', '/scratch-host', LIMITS, async () => undefined, OWNER)
    await lab.run({ workerId: 'quantize-run', command: ['true'] })
    const create = podman.calls[0]!.join(' ')
    expect(create).toContain('thyrox.owner-kind=lab')
    expect(create).toContain('--network none')
    expect(create).toContain('--memory 8192m')
    expect(create).toContain('/scratch-host:/scratch:rw')
  })
})

describe('la ejecución se autoriza por paso', () => {
  test('compone la autorización de la clase quantization citando su tarea dueña', async () => {
    const podman = fakePodman()
    const lab = new QuantizationLab(podman, 'image-id', '/scratch-host', LIMITS, async () => undefined, OWNER)
    await lab.run({ workerId: 'quantize-run', command: ['true'] })
    const create = podman.calls[0]!.join(' ')
    expect(create).toContain(`--label ${EXECUTION_KIND_LABEL_KEY}=quantization`)
    expect(create).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0718`)
    expect(create).toContain(`--label ${EXECUTION_ID_LABEL_KEY}=quantize-run`)
  })

  test('la cita de la tarea que autoriza es declarable por el llamador', async () => {
    const podman = fakePodman()
    const lab = new QuantizationLab(podman, 'image-id', '/scratch-host', LIMITS, async () => undefined, OWNER, 'TASK-THYROX-0743')
    await lab.run({ workerId: 'quantize-run', command: ['true'] })
    expect(podman.calls[0]!.join(' ')).toContain(`--label ${EXECUTION_REFERENCE_LABEL_KEY}=task:TASK-THYROX-0743`)
  })
})

describe('mandatory execution path', () => {
  test('no module of the package composes its own podman run', async () => {
    const glob = new Bun.Glob('*.ts')
    const offenders: string[] = []
    for await (const file of glob.scan({ cwd: `${import.meta.dir}/..` })) {
      const text = await Bun.file(`${import.meta.dir}/../${file}`).text()
      if (/\[\s*'run'\s*,\s*'--rm'/.test(text)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
