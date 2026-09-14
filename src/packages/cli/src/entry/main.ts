#!/usr/bin/env bun
/**
 * El punto de entrada de thyrox.
 *
 * Se llama `main` porque así lo llaman las DOS referencias, que aquí
 * coinciden: `restored-src: src/main.tsx` (v2.1.88, monolítico) y
 * `ccnmt: packages/cli/src/entry/main.tsx` (el mismo producto, ya
 * particionado). Ninguna de las dos tiene un directorio `bin/` — medido: 0 en
 * cada una— ni declara `bin` en ningún `package.json`.
 *
 * Antes se llamaba `bin/harness.ts` y tenía 666 líneas: el nombre venía del
 * paquete `@thyrox/harness`, retirado en #226/#266, y el cuerpo fundía en una
 * cascada de `argv.includes` los siete comandos, la carga de settings, el
 * cableado de herramientas y el bucle. Todo eso vive ahora en `commands/` y
 * `entry/`; aquí sólo queda arrancar.
 *
 * `import.meta.main` es lo único que este archivo puede tener y ningún otro:
 * el módulo se puede importar desde un test sin ejecutar nada, y ejecutar
 * desde la terminal sin importar nada.
 *
 * ACTIVACIÓN DE `@thyrox/config`, agregada tras un intento real de correr
 * `--connection` (T-9): `getGlobalConfig`/`saveGlobalConfig` -- lo que
 * `connections.ts` usa -- exigen DOS pasos de activación antes de aceptar
 * lectura/escritura, medidos al fallar dos veces en la práctica, no leídos
 * del código:
 *
 *   1. `installConfigHostBindings(...)` (`@thyrox/config/host.js`) -- sin
 *      ella, `ConfigHostBindingsError: Config host bindings have not been
 *      installed`. `{}` basta: cada binding que falte cae a `node:fs` real
 *      (`_fs()` en `global/config.ts`) y `getConfigHomeDir` cae a
 *      `HOME`-derivado, que es lo que este binario necesita.
 *   2. `enableConfigs()` (`@thyrox/config`) -- sin ella, `ConfigAccessError:
 *      Config accessed before allowed`, aunque los bindings ya estén.
 *
 * Ninguna de las dos la hacía este archivo (ni ningún otro de `cli/`):
 * `--connection` en `runLoop.ts` era código muerto en el único binario real
 * que lo invoca -- funcionaba en sus propios tests porque esos llaman
 * `getConnectionContextOptions` directo sobre un objeto, sin pasar nunca por
 * `saveConnection`/`getConnection`. Medido end-to-end en
 * `.claude/workbench/correr-connectionToolCompression-de-verdad-<ISO>/`.
 *
 * Va DENTRO de `import.meta.main`, no a nivel de módulo: activar config
 * durante un `import` (todos los tests de este árbol importan `runCli`/
 * `runLoop` directo) tocaría un recurso global compartido entre archivos de
 * test que no lo esperan. Ambas llamadas son idempotentes -- vuelven a
 * ejecutarse en cada invocación real del binario sin efecto si ya corrieron.
 */
import { runCli } from './run-cli.ts'
import { EXIT_USAGE } from '../exitCodes.ts'
import { installConfigHostBindings } from '@thyrox/config/host.js'
import { enableConfigs } from '@thyrox/config'

export { runCli }

if (import.meta.main) {
  installConfigHostBindings({})
  enableConfigs()
  try {
    process.exit(await runCli(process.argv.slice(2)))
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(EXIT_USAGE)
  }
}
