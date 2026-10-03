#!/usr/bin/env bun
/** Entrada de `bin/local-models-quantize`; la orden vive en `quantizeCommand.ts`. */
import { resolve } from 'node:path'

import { processOutput } from '../commandOutput.js'
import { runQuantizeCommand } from '../quantizeCommand.js'

const thyroxRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '..', '..', '..', '..')
process.exit(await runQuantizeCommand(process.argv.slice(2), { env: process.env, thyroxRoot, output: processOutput, now: () => new Date() }))
