/**
 * El cargador de CLAUDE.md de 2.1.275 (`ob`/`qwo`, `hF`, `AEe`, `x7e`/`Gtn`,
 * `Iwo`, `Hwo`, `Qtn` en `chunk-q2gh92k2.js`), medido sobre un árbol
 * temporal: usuario, proyecto hacia arriba desde el cwd, reglas, locales,
 * `@include`, `paths:` y `claudeMdExcludes`.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const base = mkdtempSync(join(resolve(import.meta.dir, '../../../../../.claude/cache'), 'claudemd-'))
const home = join(base, 'home')
const repo = join(base, 'repo')
const sub = join(repo, 'pkg')
const outside = join(base, 'fuera')
for (const d of [home, join(home, 'rules'), join(repo, '.claude', 'rules', 'anidada'), sub, outside]) mkdirSync(d, { recursive: true })
writeFileSync(join(home, 'CLAUDE.md'), 'USUARIO')
writeFileSync(join(home, 'rules', 'u.md'), 'REGLA-USUARIO')
writeFileSync(join(home, 'settings.json'), JSON.stringify({ claudeMdExcludes: ['**/excluido/CLAUDE.md'] }))
writeFileSync(join(repo, 'CLAUDE.md'), 'RAIZ\n\nver @./pkg/incluido.md y @./hermano.md\n')
writeFileSync(join(sub, 'incluido.md'), 'INCLUIDO @./incluido.md')
writeFileSync(join(repo, 'hermano.md'), 'HERMANO')
writeFileSync(join(repo, '.claude', 'CLAUDE.md'), 'PUNTO-CLAUDE')
writeFileSync(join(repo, '.claude', 'rules', 'r.md'), 'REGLA-PROYECTO')
writeFileSync(join(repo, '.claude', 'rules', 'anidada', 'n.md'), 'REGLA-ANIDADA')
writeFileSync(join(repo, '.claude', 'rules', 'condicional.md'), '---\npaths: src/**/*.ts\n---\nREGLA-CONDICIONAL')
writeFileSync(join(repo, '.claude', 'rules', 'nota.txt'), 'NO-ES-MD')
writeFileSync(join(repo, 'CLAUDE.local.md'), 'LOCAL\n\n<!-- oculto -->\nvisible')
writeFileSync(
  join(sub, 'CLAUDE.md'),
  'SUB @../fuera-no.md @' + join(outside, 'externo.md') +
    '\n\nen línea ` @./en-codigo.md `\n\n```\n@./en-cerca.md\n```\n\n@' + join(outside, 'enlace-entra.md') + ' @./enlace-sale.md\n',
)
writeFileSync(join(sub, 'en-codigo.md'), 'NO-DEBE-CARGAR')
writeFileSync(join(sub, 'en-cerca.md'), 'NO-DEBE-CARGAR')
// Un enlace escrito fuera que apunta dentro, y uno escrito dentro que sale.
writeFileSync(join(sub, 'objetivo.md'), 'OBJETIVO')
symlinkSync(join(sub, 'objetivo.md'), join(outside, 'enlace-entra.md'))
writeFileSync(join(outside, 'destino.md'), 'DESTINO')
symlinkSync(join(outside, 'destino.md'), join(sub, 'enlace-sale.md'))
writeFileSync(join(outside, 'externo.md'), 'EXTERNO')
mkdirSync(join(sub, 'excluido'))
process.env.CLAUDE_CONFIG_DIR = home
process.chdir(sub)

// Los settings (y con ellos `claudeMdExcludes`) exigen los bindings de host.
const { installConfigHostBindings } = await import('@thyrox/config/host')
installConfigHostBindings({ logDebug: () => {}, getConfigHomeDir: () => home } as never)
const { setOriginalCwd } = await import('@thyrox/app-host/bootstrap/state.js')
setOriginalCwd(sub)
const { getMemoryFiles, resetGetMemoryFilesCache, clearMemoryFileCaches, getClaudeMds } = await import('../claudemd.ts')

afterAll(() => rmSync(base, { recursive: true, force: true }))
beforeEach(() => clearMemoryFileCaches())

// El árbol temporal vive dentro de thyrox: al subir desde el cwd también
// aparecen sus CLAUDE.md, así que se mide sólo lo que cuelga de `base`.
const ours = async (force = false) => (await getMemoryFiles(force)).filter(f => f.path.startsWith(base) || f.path.startsWith(home))
const contents = async (force = false) => (await ours(force)).map(f => f.content.trim())

describe('getMemoryFiles', () => {
  test('orden: usuario y sus reglas, luego de la raíz hacia el cwd', async () => {
    const files = await ours()
    const order = files.map(f => `${f.type}:${f.content.split(/\s/)[0]}`)
    expect(order.slice(0, 2)).toEqual(['User:USUARIO', 'User:REGLA-USUARIO'])
    const i = order.indexOf('Project:RAIZ')
    const j = order.indexOf('Project:SUB')
    expect(i).toBeGreaterThan(1)
    expect(j).toBeGreaterThan(i)
    expect(order.indexOf('Local:LOCAL')).toBeGreaterThan(i)
    expect(order.indexOf('Local:LOCAL')).toBeLessThan(j)
  })
  test('reglas del proyecto: recursivas, sólo .md, sin las condicionales', async () => {
    const c = await contents()
    expect(c).toContain('REGLA-PROYECTO')
    expect(c).toContain('REGLA-ANIDADA')
    expect(c).not.toContain('REGLA-CONDICIONAL')
    expect(c).not.toContain('NO-ES-MD')
  })
  test('@include: se sigue una vez, con padre, y nunca desde código', async () => {
    const files = await ours()
    const inc = files.filter(f => f.content.startsWith('INCLUIDO'))
    expect(inc).toHaveLength(1)
    expect(inc[0]!.parent).toBe(join(repo, 'CLAUDE.md'))
    expect(files.some(f => f.content === 'NO-DEBE-CARGAR')).toBe(false)
  })
  test('un @include fuera de la raíz de la sesión sólo con la inclusión externa', async () => {
    // Medido en 2.1.275 (`f5` contra `ye()`): el hermano de un CLAUDE.md
    // superior también queda fuera si no cuelga de la raíz de la sesión.
    expect(await contents()).not.toContain('EXTERNO')
    expect(await contents()).not.toContain('HERMANO')
    expect(await contents(true)).toContain('EXTERNO')
    expect(await contents(true)).toContain('HERMANO')
  })
  test('la frontera se mide antes y después de resolver el enlace', async () => {
    // Escrito fuera: lo corta el bucle de includes (ruta sin resolver).
    expect(await contents()).not.toContain('OBJETIVO')
    // Escrito dentro pero resuelto fuera: lo corta la carga (ruta resuelta).
    expect(await contents()).not.toContain('DESTINO')
    expect(await contents(true)).toContain('DESTINO')
  })
  test('los comentarios HTML se quitan y el crudo se conserva', async () => {
    const local = (await ours()).find(f => f.type === 'Local')!
    expect(local.content).not.toContain('oculto')
    expect(local.contentDiffersFromDisk).toBe(true)
    expect(local.rawContent).toContain('oculto')
  })
  test('claudeMdExcludes deja fuera lo que casa', async () => {
    writeFileSync(join(sub, 'excluido', 'CLAUDE.md'), 'EXCLUIDO')
    setOriginalCwd(join(sub, 'excluido'))
    try {
      resetGetMemoryFilesCache('test')
      expect((await contents()).some(c => c.startsWith('SUB'))).toBe(true)
      expect(await contents()).not.toContain('EXCLUIDO')
    } finally {
      setOriginalCwd(sub)
    }
  })
  test('memoizado hasta el reset', async () => {
    const a = await getMemoryFiles()
    expect(await getMemoryFiles()).toBe(a)
    resetGetMemoryFilesCache('test')
    expect(await getMemoryFiles()).not.toBe(a)
  })
  test('un enlace cíclico de reglas no cuelga', async () => {
    const loop = join(repo, '.claude', 'rules', 'anidada', 'ciclo')
    symlinkSync(join(repo, '.claude', 'rules'), loop)
    try {
      expect((await contents()).filter(c => c === 'REGLA-PROYECTO')).toHaveLength(1)
    } finally {
      rmSync(loop)
    }
  })
})

describe('getClaudeMds', () => {
  test('nombra cada archivo con su ruta y trae su contenido', async () => {
    const text = getClaudeMds(await getMemoryFiles())
    expect(text).toContain(join(repo, 'CLAUDE.md'))
    expect(text).toContain('RAIZ')
  })
  test('sin archivos, cadena vacía', () => {
    expect(getClaudeMds([])).toBe('')
  })
})
