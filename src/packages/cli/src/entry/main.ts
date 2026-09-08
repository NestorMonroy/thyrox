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
 */
import { runCli } from './run-cli.ts'
import { EXIT_USAGE } from '../exitCodes.ts'

export { runCli }

if (import.meta.main) {
  try {
    process.exit(await runCli(process.argv.slice(2)))
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(EXIT_USAGE)
  }
}
