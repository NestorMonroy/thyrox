// Cierre de referencia de la vía rápida de --version: las importaciones estáticas de cli.tsx más el perfilador de arranque.
import '../../../src/entry/productName.ts'
import 'node:fs'
import 'node:path'
import '@thyrox/app-host/startup/startupProfiler.js'
