// Precarga de prueba: al salir, escribe la lista de módulos cargados en el archivo que declara THYROX_TEST_MODULE_LIST.
import { writeFileSync } from 'node:fs'

const target = process.env.THYROX_TEST_MODULE_LIST
if (target) {
  process.on('exit', () => {
    writeFileSync(target, `${Object.keys(require.cache).join('\n')}\n`)
  })
}
