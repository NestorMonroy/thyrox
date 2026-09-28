/**
 * Compila `vendor/<arch>-linux/transparent.node` desde `native/transparent.c`.
 * Sale 0 si compiló, 1 si no (con la causa), sin tratar un fallo de toolchain
 * como un error del paquete.
 */
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildTransparentNative } from '../src/build.ts'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(path.join(packageRoot, 'vendor', `${process.arch}-linux`), { recursive: true })
const result = buildTransparentNative(packageRoot)
if (result.built) {
  console.log(`built ${result.output}`)
} else {
  console.error(`not built: ${result.reason}`)
  process.exitCode = 1
}
