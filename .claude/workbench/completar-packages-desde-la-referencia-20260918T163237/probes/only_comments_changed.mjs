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
import { execFileSync } from 'node:child_process'

// Las dos bases son parametro, no constante: este control nacio para
// `permission` y ahora sirve a los doce paquetes. `PACKAGE` fija el paquete
// de una vez; `REF_BASE`/`PORT_BASE` lo sobreescriben entero cuando hace
// falta comparar contra otro arbol. Los nombres viejos siguen valiendo para
// no romper una invocacion ya escrita.
const PACKAGE = process.env.PACKAGE ?? 'permission'
const REFERENCE = process.env.REF_BASE ?? process.env.PERMISSION_REF
  ?? `/home/user/claude-code-nestor-monroy-tools/packages/${PACKAGE}`
const PORT = process.env.PORT_BASE ?? process.env.PERMISSION_PORT
  ?? `/home/user/thyrox/src/packages/${PACKAGE}`

function stripComments (path, source) {
  source ??= readFileSync(path, 'utf8')
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

// `--ref-git <sha>` cambia el SUJETO de la comparacion: en vez de ccnmt,
// la referencia es el arbol de ese commit. Hace falta desde el renombre del
// alcance: un `import` es codigo, asi que todo archivo con import diverge de
// ccnmt POR CONSTRUCCION y el control mediria el renombre en vez de la
// traduccion. El commit de renombre de cada paquete es el estado verbatim
// contra el que la traduccion es el unico cambio.
// La ruta que git conoce es relativa a la raiz del arbol, no a la base del
// paquete: se recompone desde PORT.
const gitPath = (relative) =>
  `${PORT.replace('/home/user/thyrox/', '')}/${relative}`
const iRefGit = argv.indexOf('--ref-git')
const REF_GIT = iRefGit === -1 ? null : argv[iRefGit + 1]
const relatives = argv.slice(2).filter((a, i) =>
  a !== '--ref-git' && (iRefGit === -1 || i !== iRefGit + 1 - 2))
let divergent = 0
for (const relative of relatives) {
  let a, b
  try {
    a = REF_GIT
      ? stripComments(`${PORT}/${relative}`,
          execFileSync('git', ['show', `${REF_GIT}:${gitPath(relative)}`],
            { cwd: '/home/user/thyrox', encoding: 'utf8', maxBuffer: 64 << 20 }))
      : stripComments(`${REFERENCE}/${relative}`)
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
