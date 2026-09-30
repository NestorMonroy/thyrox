#!/usr/bin/env bun
/**
 * CLI del build JavaScript de los paquetes del workspace
 * (`../buildJavascript.ts`).
 *
 *   typescript-build-javascript <paquete>...          construye y repunta
 *   typescript-build-javascript --check <paquete>...  exit 1 si algún default no es un .js existente
 */
import { main } from '../buildJavascript.ts'

process.exit(await main(process.argv.slice(2)))
