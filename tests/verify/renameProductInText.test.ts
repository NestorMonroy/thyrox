/**
 * Rebautiza el producto en el texto visible de un archivo TypeScript: sólo en
 * literales de cadena, plantillas y texto JSX, nunca en identificadores ni
 * comentarios (TASK #67, fase C). El nombre sale de la constante
 * `PRODUCT_NAME`, que el archivo importa si hace falta.
 */
import { describe, expect, test } from 'bun:test'
import { renameProductInComments, renameProductInSource } from '../../src/verify/renameProductInText'

const IMPORT = "import { PRODUCT_NAME } from '@thyrox/config/product'"
const OLD = ['Cl', 'aude'].join('')
const run = (text: string, fileName = 'x.ts') => renameProductInSource(fileName, text, { importFrom: '@thyrox/config/product' })

describe('renameProductInSource', () => {
  test('una cadena simple pasa a plantilla con la constante e importa', () => {
    const r = run(`const a = 'Restart ${OLD} Code now'\n`)
    expect(r.text).toBe(`${IMPORT}\nconst a = \`Restart \${PRODUCT_NAME} now\`\n`)
    expect(r.edits).toHaveLength(1)
  })

  test('dentro de una plantilla se inserta la sustitución', () => {
    const r = run(`const a = \`${OLD} saw \${n} files\`\n`)
    expect(r.text).toContain('`${PRODUCT_NAME} saw ${n} files`')
  })

  test('el texto JSX usa una expresión', () => {
    const r = run(`const e = <Text>Ask ${OLD} anything</Text>\n`, 'x.tsx')
    expect(r.text).toContain('<Text>Ask {PRODUCT_NAME} anything</Text>')
  })

  test('identificadores y comentarios no se tocan', () => {
    const src = `// ${OLD} dice\nconst is${OLD}AI = 1\n`
    const r = run(src)
    expect(r.text).toBe(src)
    expect(r.edits).toHaveLength(0)
  })

  test('los nombres de modelo pierden el prefijo y la API es la de Anthropic', () => {
    const r = run(`const a = '${OLD} Opus 4.8 via the ${OLD} API'\n`)
    expect(r.text).toContain("'Opus 4.8 via the Anthropic API'")
    expect(r.text).not.toContain('PRODUCT_NAME')
  })

  test('el archivo de instrucciones pasa a THYROX.md', () => {
    expect(run(`const a = 'edit ${OLD.toUpperCase()}.md'\n`).text).toContain("'edit THYROX.md'")
  })

  test('un nombre unido con guion es un identificador de protocolo y no se toca', () => {
    const src = `const h = '${OLD}-Session: x'\n`
    expect(run(src).text).toBe(src)
  })

  test('una cadena con comilla invertida se escapa al pasar a plantilla', () => {
    const r = run(`const a = 'run \`x\` in ${OLD}'\n`)
    expect(r.text).toContain('`run \\`x\\` in ${PRODUCT_NAME}`')
  })

  test('si la constante ya está importada no se repite', () => {
    const r = run(`${IMPORT}\nconst a = '${OLD}'\n`)
    expect(r.text.split(IMPORT)).toHaveLength(2)
  })

  test('un atributo JSX pasa a expresión entre llaves', () => {
    const r = run(`const e = <Dialog title="Log in to ${OLD}" />\n`, 'x.tsx')
    expect(r.text).toContain('<Dialog title={`Log in to ${PRODUCT_NAME}`} />')
  })

  test('un guion seguido de minúscula es prosa y sí se rebautiza', () => {
    expect(run(`const a = '${OLD}-voice replies'\n`).text).toContain('`${PRODUCT_NAME}-voice replies`')
  })

  test('un nombre de modelo con versión delante conserva versión y familia', () => {
    expect(run(`const a = '${OLD} 3.7 Sonnet'\n`).text).toContain("'3.7 Sonnet'")
  })

  test('la familia de modelos del proveedor se nombra por el proveedor', () => {
    const r = run(`const a = 'The most recent ${OLD} model family is ${OLD} 4.X; use the latest ${OLD} models'\n`)
    expect(r.text).toContain("'The most recent Anthropic model family is Anthropic 4.X; use the latest Anthropic models'")
  })

  test('un dominio no se rebautiza', () => {
    const src = `const a = 'the ${OLD}.ai marketplace'\n`
    expect(run(src).text).toBe(src)
  })

  test('una declaración cuyo nombre dice legacy conserva su literal', () => {
    const src = `export const LEGACY_FILE = '${OLD.toUpperCase()}.md'\nconst a = { legacyName: '${OLD}' }\n`
    expect(run(src).text).toBe(src)
  })

  test('una declaración marcada para conservar no cambia', () => {
    const src = `// renameProductInText: keep\nexport const KEYS = { A: '~/.x/${OLD.toUpperCase()}.md', B: '${OLD}' }\nconst c = '${OLD}'\n`
    const r = run(src)
    expect(r.text).toContain(`// renameProductInText: keep\nexport const KEYS = { A: '~/.x/${OLD.toUpperCase()}.md', B: '${OLD}' }\n`)
    expect(r.edits).toHaveLength(1)
  })

  test('un especificador de módulo no se toca', () => {
    const src = `import x from './${OLD}Thing'\n`
    expect(run(src).text).toBe(src)
  })
})

describe('renameProductInComments', () => {
  const runC = (text: string) => renameProductInComments('x.ts', text)

  test('los comentarios de línea y de bloque dicen thyrox', () => {
    const r = runC(`// so ${OLD} can respond\n/** ${OLD} Code on the host */\nconst a = '${OLD}'\n`)
    expect(r.text).toBe(`// so thyrox can respond\n/** thyrox on the host */\nconst a = '${OLD}'\n`)
  })

  test('las cadenas y los identificadores no se tocan', () => {
    const src = `const is${OLD}Ready = "${OLD}"\n`
    expect(runC(src).text).toBe(src)
  })

  test('dominios, aplicaciones y modelos siguen las reglas de las cadenas', () => {
    const r = runC(`// ${OLD}.ai users, the ${OLD}.app bundle, ${OLD} 4+ models\n`)
    expect(r.text).toBe(`// ${OLD}.ai users, the ${OLD}.app bundle, Anthropic 4+ models\n`)
  })

  test('una mención con versión del ejecutable se deja para revisarla a mano', () => {
    const src = `// ported from ${OLD} Code 2.1.283\n`
    const r = runC(src)
    expect(r.text).toBe(src)
    expect(r.pending).toEqual([1])
  })
})
