#!/usr/bin/env bun
/** Entrada de `bin/local-models-qualify`; la orden vive en `qualifyCommand.ts`. */
import { resolve } from 'node:path'

import { processOutput } from '../commandOutput.js'
import { runQualifyCommand } from '../qualifyCommand.js'

const thyroxRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '..', '..', '..', '..')
process.exit(await runQualifyCommand(process.argv.slice(2), { env: process.env, thyroxRoot, output: processOutput, now: () => new Date() }))
