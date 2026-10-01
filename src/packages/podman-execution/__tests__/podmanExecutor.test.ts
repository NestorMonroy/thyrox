import { describe, expect, test } from 'bun:test'

import { runCommand } from '../podmanExecutor.js'

const STDIN_KIND = 'if [ -p /dev/stdin ]; then echo fifo; elif [ -S /dev/stdin ]; then echo socket; else echo other; fi'

describe('runCommand', () => {
  test('con stdin declarado, el hijo lo recibe por una FIFO: Podman exige un pipe con nombre para `-`', async () => {
    const result = await runCommand('sh', ['-c', `${STDIN_KIND}; cat`], { stdin: 'valor-de-prueba' })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('fifo\nvalor-de-prueba')
  })

  test('el valor no viaja en argv ni en el entorno del hijo', async () => {
    const result = await runCommand('sh', ['-c', 'cat /proc/self/cmdline; env; cat >/dev/null'], { stdin: 'valor-que-no-se-ve' })
    expect(result.stdout).not.toContain('valor-que-no-se-ve')
  })

  test('si el hijo sale sin leer su stdin, la entrega no deja colgado al llamador', async () => {
    const result = await runCommand('sh', ['-c', 'exit 3'], { stdin: 'nadie-lo-lee' })
    expect(result.exitCode).toBe(3)
  })

  test('sin stdin declarado, el hijo no recibe entrada', async () => {
    const result = await runCommand('sh', ['-c', 'cat; echo fin'])
    expect(result.stdout).toBe('fin\n')
  })
})
