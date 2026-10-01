#!/usr/bin/env bun
/** Entrada de `bin/semantic-search-ingest`; la orden vive en `ingestCommand.ts`. */
import { runIngestCommand } from '../ingestCommand.ts'

const output = { stdout: (line: string) => { process.stdout.write(`${line}\n`) }, stderr: (line: string) => { process.stderr.write(`${line}\n`) } }
process.exit(await runIngestCommand(process.argv.slice(2), { env: process.env, output }))
