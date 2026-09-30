// Control de la traducción: el puerto y la referencia tienen que producir el
// MISMO código una vez retirados los comentarios. Si difieren, la traducción
// tocó algo que no era un comentario.
//
// El instrumento es `ts.transpileModule` con `removeComments: true`, no un
// clasificador de comentarios por expresión regular: un `//` dentro de un
// template literal o el texto de un elemento JSX no son comentarios, y una
// expresión regular no los separa. El compilador sí.
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'
import { readFileSync } from 'node:fs'
import { argv, exit } from 'node:process'

const REFERENCE = process.env.PERMISSION_REF
  ?? '/home/user/claude-code-nestor-monroy-tools/packages/permission'
const PORT = process.env.PERMISSION_PORT
  ?? '/home/user/thyrox/src/packages/permission'

function stripComments (path) {
  const source = readFileSync(path, 'utf8')
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: false,
    compilerOptions: {
      removeComments: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: path.endsWith('.tsx') ? ts.JsxEmit.Preserve : ts.JsxEmit.None,
      isolatedModules: true,
    },
  })
  return result.outputText
}

const relatives = argv.slice(2)
let divergent = 0
for (const relative of relatives) {
  let a, b
  try {
    a = stripComments(`${REFERENCE}/${relative}`)
    b = stripComments(`${PORT}/${relative}`)
  } catch (error) {
    console.log(`ERROR    ${relative}: ${error.message}`)
    divergent += 1
    continue
  }
  if (a !== b) {
    console.log(`DIVERGE  ${relative}`)
    divergent += 1
  }
}
console.log(`archivos comparados=${relatives.length}  divergentes=${divergent}`)
exit(divergent === 0 ? 0 : 1)
