// Control de anulación: una inicialización ansiosa que invoca el Podman declarado en THYROX_TOOLCHAIN_PODMAN_BIN al evaluarse.
Bun.spawnSync([process.env.THYROX_TOOLCHAIN_PODMAN_BIN ?? 'podman', 'info'], { stdin: 'ignore' })
