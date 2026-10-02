// Corre una suite PostgreSQL con la URL de pruebas DECLARADA (reach: proceso y
// después .env), sin imprimirla: sólo viaja en el entorno del hijo. Sin
// declaración sale 2 nombrando la variable — nunca un verde sin medir.
import { envValue } from '@thyrox/paths/reach.ts'

const [packageDir, ...files] = process.argv.slice(2)
const name = 'THYROX_TEST_POSTGRES_URL'
const url = envValue(name)
if (!url) {
  console.error(`${name} absent: PostgreSQL suite not measured`)
  process.exit(2)
}
console.error(`${name} present`)
const child = Bun.spawnSync(['bun', 'test', ...files], { cwd: packageDir, env: { ...process.env, [name]: url }, stdout: 'inherit', stderr: 'inherit' })
process.exit(child.exitCode ?? 1)
