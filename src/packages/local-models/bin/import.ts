#!/usr/bin/env bun
/** Entrada de `bin/local-models-import`; la orden vive en `importCommand.ts`. */
import { resolve } from 'node:path'

import { processOutput } from '../commandOutput.js'
import { runImportCommand } from '../importCommand.js'

const thyroxRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '..', '..', '..', '..')
process.exit(await runImportCommand(process.argv.slice(2), { env: process.env, thyroxRoot, output: processOutput, now: () => new Date() }))
