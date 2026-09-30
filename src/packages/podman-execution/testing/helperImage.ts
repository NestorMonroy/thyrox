/**
 * Imagen de ayuda para las pruebas contra el Podman real, construida SIN red
 * con la técnica de `src/lib/podman_capabilities.sh`: un ayudante estático en
 * C dentro de un tar propio, `podman import`.
 *
 * Modos del ayudante (`/bin/helper <modo> …`):
 *
 *   exit <n>            sale con el código n;
 *   term <n>            instala un manejador de SIGTERM que sale con n,
 *                       escribe `ready` en stdout y espera la señal;
 *   write <ruta> <txt>  escribe txt en ruta y sale 0 (3 si no pudo).
 *
 * El manejador es obligatorio en `term`: el proceso es el PID 1 del
 * contenedor y el kernel descarta una señal sin manejador dirigida a él.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createPodmanExecutor, runCommand, type PodmanExecutor } from '../podmanExecutor.js'

/** Directorios que la imagen trae de fábrica: destino del repositorio y salida de artefactos. */
const IMAGE_DIRECTORIES = ['bin', 'w', 'out'] as const

const HELPER_SOURCE = `#include <fcntl.h>
#include <signal.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static int term_exit_code = 0;

static void on_term(int signal_number) {
    (void) signal_number;
    _exit(term_exit_code);
}

int main(int argc, char **argv) {
    if (argc >= 3 && strcmp(argv[1], "exit") == 0) return atoi(argv[2]);
    if (argc >= 3 && strcmp(argv[1], "term") == 0) {
        term_exit_code = atoi(argv[2]);
        signal(SIGTERM, on_term);
        write(1, "ready\\n", 6);
        for (;;) pause();
    }
    if (argc >= 4 && strcmp(argv[1], "write") == 0) {
        int fd = open(argv[2], O_WRONLY | O_CREAT | O_TRUNC, 0644);
        if (fd < 0) return 3;
        size_t length = strlen(argv[3]);
        if (write(fd, argv[3], length) != (ssize_t) length) return 3;
        close(fd);
        return 0;
    }
    return 1;
}
`

/** Una herramienta del anfitrión falló al construir la imagen; nombra el paso y su stderr. */
export class HelperImageBuildError extends Error {
  constructor(step: string, detail: string) {
    super(`no se pudo construir la imagen de ayuda en el paso ${step}: ${detail}`)
    this.name = 'HelperImageBuildError'
  }
}

export type HelperImage = {
  image: string
  podman: PodmanExecutor
  dispose(): Promise<void>
}

async function requireSuccess(step: string, bin: string, args: readonly string[]): Promise<void> {
  const result = await runCommand(bin, args)
  if (result.exitCode !== 0) throw new HelperImageBuildError(step, result.stderr.trim() || `exit ${result.exitCode}`)
}

function writeRootfs(workDir: string): string {
  const rootfs = join(workDir, 'rootfs')
  for (const directory of IMAGE_DIRECTORIES) mkdirSync(join(rootfs, directory), { recursive: true })
  return rootfs
}

/** ¿Hay Podman y gcc en el anfitrión? Sin ellos las pruebas reales no pueden medir. */
export async function canBuildHelperImage(): Promise<boolean> {
  const probes = await Promise.all([
    runCommand('sh', ['-c', 'command -v gcc']).catch(() => null),
    createPodmanExecutor().run(['--version']).catch(() => null),
  ])
  return probes.every(result => result !== null && result.exitCode === 0)
}

/** Compila el ayudante, lo empaqueta y lo importa con un nombre que lleva `tag`. */
export async function buildHelperImage(tag: string): Promise<HelperImage> {
  const podman = createPodmanExecutor()
  const workDir = mkdtempSync(join(tmpdir(), 'podman-helper-'))
  const image = `localhost/thyrox-podman-execution-${tag}`
  try {
    writeFileSync(join(workDir, 'helper.c'), HELPER_SOURCE)
    const rootfs = writeRootfs(workDir)
    await requireSuccess('gcc', 'gcc', ['-static', '-O2', '-o', join(rootfs, 'bin/helper'), join(workDir, 'helper.c')])
    await requireSuccess('tar', 'tar', ['-C', rootfs, '-cf', join(workDir, 'rootfs.tar'), '.'])
    const imported = await podman.run(['import', join(workDir, 'rootfs.tar'), image])
    if (imported.exitCode !== 0) throw new HelperImageBuildError('podman import', imported.stderr.trim())
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
  return {
    image,
    podman,
    async dispose() {
      await podman.run(['rmi', '--force', image])
    },
  }
}
