#!/usr/bin/env bun
/** Entrada de `bin/local-models-catalog`; la orden vive en `catalogCommand.ts`. */
import { resolve } from 'node:path'

import { runCatalogCommand } from '../catalogCommand.js'
import { processOutput } from '../commandOutput.js'

const thyroxRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '..', '..', '..', '..')
process.exit(await runCatalogCommand(process.argv.slice(2), { env: process.env, thyroxRoot, output: processOutput, now: () => new Date() }))
