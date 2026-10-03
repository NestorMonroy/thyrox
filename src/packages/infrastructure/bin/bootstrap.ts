#!/usr/bin/env bun
/** Entrada de `bin/infrastructure-bootstrap`; la orden vive en `bootstrapCommand.ts`. */
import { runBootstrapCommand } from '../bootstrapCommand.ts'

const output = { stdout: (line: string) => { process.stdout.write(`${line}\n`) }, stderr: (line: string) => { process.stderr.write(`${line}\n`) } }
process.exit(await runBootstrapCommand({ input: await Bun.stdin.text(), environment: process.env, ownerPid: process.pid, output }))
