// ¿La puerta '.' de un paquete ya publica estos nombres? Resuelve desde el
// paquete consumidor, con el resolutor de Bun, y mira lo exportado.
import { exportedNames } from '../../../../src/verify/namedImports.ts'
const [spec, fromDir, ...names] = process.argv.slice(2)
const target = Bun.resolveSync(spec, fromDir)
const exported = exportedNames(target)
for (const n of names) console.log(`${spec}\t${n}\t${exported.has(n) ? 'PUBLICADO' : 'ausente'}\t${target}`)
