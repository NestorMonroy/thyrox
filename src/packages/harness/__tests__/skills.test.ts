/**
 * El skill como código — el segundo sustrato del corpus de referencia.
 *
 * Fuente: el sustrato de skill del corpus de referencia (un `SKILL.md` es
 * texto; un skill como código tiene prompt-función y estado). El test fija que
 * el prompt reciba argumentos y estado, no que devuelva una plantilla fija.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SkillRegistry, extractDirFor, type SkillDefinition } from '../src/skills/registry.ts'
import type { Message } from '../src/types.ts'

/**
 * El skill como codigo tiene dos diferencias con un `SKILL.md`, y ninguna es
 * de formato: el prompt es una FUNCION —puede leer el estado de la sesion— y
 * los archivos de apoyo van EMBEBIDOS y se extraen al invocar.
 *
 * Cada prueba de aqui apunta a una de las dos, o a la frontera de seguridad
 * que la extraccion cruza al escribir en disco.
 */

async function raiz(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'skills-'))
}

const BASE: SkillDefinition = {
  name: 'demo',
  description: 'un skill de prueba',
  getPrompt: () => [{ type: 'text', text: 'cuerpo' }],
}

describe('el prompt es una funcion, no un texto (T-067)', () => {
  test('recibe los argumentos de la invocacion', async () => {
    const r = new SkillRegistry()
    r.register({
      ...BASE,
      getPrompt: (ctx) => [{ type: 'text', text: `hola ${ctx.args}` }],
    })
    const blocks = await r.invoke('demo', { args: 'mundo', messages: [] })
    expect(blocks[0]).toEqual({ type: 'text', text: 'hola mundo' })
  })

  test('lee el estado de la sesion — lo que un SKILL.md NO puede', async () => {
    const r = new SkillRegistry()
    r.register({
      ...BASE,
      getPrompt: (ctx) => [{ type: 'text', text: `turnos: ${ctx.messages.length}` }],
    })
    const dos: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'a' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'b' }] },
    ]
    const a = await r.invoke('demo', { args: '', messages: [] })
    const b = await r.invoke('demo', { args: '', messages: dos })
    // El mismo skill, dos sesiones, dos prompts. Un `.md` daria el mismo texto
    // en las dos: su contenido no depende de nada.
    expect((a[0] as { text: string }).text).toBe('turnos: 0')
    expect((b[0] as { text: string }).text).toBe('turnos: 2')
  })

  test('admite un prompt asincrono', async () => {
    const r = new SkillRegistry()
    r.register({ ...BASE, getPrompt: async () => [{ type: 'text', text: 'tarde' }] })
    expect(await r.invoke('demo', { args: '', messages: [] })).toEqual([
      { type: 'text', text: 'tarde' },
    ])
  })
})

describe('los archivos de apoyo van embebidos y se extraen al invocar (T-068)', () => {
  test('el archivo aterriza en disco con su contenido', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { 'refs/guia.md': '# guia' } })
    await r.invoke('demo', { args: '', messages: [] })
    const escrito = await readFile(join(extractDirFor(root, 'demo'), 'refs/guia.md'), 'utf8')
    expect(escrito).toBe('# guia')
  })

  test('el prompt se prefija con el directorio base, fundido en el primer texto', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { 'a.md': 'x' } })
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    const dir = extractDirFor(root, 'demo')
    expect(blocks).toHaveLength(1)
    expect((blocks[0] as { text: string }).text).toBe(
      `Base directory for this skill: ${dir}\n\ncuerpo`,
    )
  })

  test('si el primer bloque NO es texto, el prefijo va como bloque propio', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({
      ...BASE,
      files: { 'a.md': 'x' },
      getPrompt: () => [{ type: 'thinking', thinking: 'previo' }],
    })
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.type).toBe('text')
    expect(blocks[1]).toEqual({ type: 'thinking', thinking: 'previo' })
  })

  test('un skill SIN files no lleva prefijo', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register(BASE)
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    expect(blocks).toEqual([{ type: 'text', text: 'cuerpo' }])
  })

  test('se extrae UNA vez por proceso, aunque dos invocaciones concurran', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { 'a.md': 'x' } })
    // Concurrentes a proposito: memoizar el RESULTADO en vez de la promesa
    // deja que las dos entren a extraer, y la segunda choca con O_EXCL.
    const [uno, dos] = await Promise.all([
      r.invoke('demo', { args: '', messages: [] }),
      r.invoke('demo', { args: '', messages: [] }),
    ])
    expect(r.extractions('demo')).toBe(1)
    // Y las dos llevan el prefijo: si la segunda hubiera fallado, no lo tendria.
    for (const blocks of [uno, dos]) {
      expect((blocks[0] as { text: string }).text).toContain('Base directory for this skill:')
    }
  })
})

describe('la frontera que la extraccion cruza al escribir en disco (T-069)', () => {
  test('una ruta que se escapa del directorio se rehusa y NO se escribe', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { '../fuera.md': 'x' } })
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    // El skill sigue sirviendo, sin prefijo: la extraccion fallo entera.
    expect(blocks).toEqual([{ type: 'text', text: 'cuerpo' }])
    await expect(readFile(join(root, 'fuera.md'), 'utf8')).rejects.toThrow()
  })

  test('una ruta absoluta se rehusa igual', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { '/etc/colado.md': 'x' } })
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    expect(blocks).toEqual([{ type: 'text', text: 'cuerpo' }])
  })

  test('un archivo pre-creado en el destino NO se sobreescribe', async () => {
    const root = await raiz()
    const dir = extractDirFor(root, 'demo')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'a.md'), 'del atacante')
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { 'a.md': 'lo nuestro' } })
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    expect(await readFile(join(dir, 'a.md'), 'utf8')).toBe('del atacante')
    // Y el prompt NO anuncia un directorio cuyo contenido no controlamos.
    expect(blocks).toEqual([{ type: 'text', text: 'cuerpo' }])
  })

  test('el fallo de extraccion no rompe el skill — sigue devolviendo su prompt', async () => {
    // El `mkdir` falla con ENOTDIR porque el padre es un ARCHIVO. No se usa un
    // bit de permiso: la suite corre como root en este contenedor (`id -u` = 0)
    // y root escribe igual sobre un directorio 0o500 — el control habria pasado
    // sin medir nada, que es el sub-patron D de `metrica-decide-la-conclusion`.
    const base = await raiz()
    const bloqueo = join(base, 'soy-un-archivo')
    await writeFile(bloqueo, 'no soy un directorio')
    const r = new SkillRegistry({ extractRoot: join(bloqueo, 'sub') })
    r.register({ ...BASE, files: { 'a.md': 'x' } })
    const blocks = await r.invoke('demo', { args: '', messages: [] })
    expect(blocks).toEqual([{ type: 'text', text: 'cuerpo' }])
  })

  test('el archivo se escribe con permiso de solo-dueno', async () => {
    const root = await raiz()
    const r = new SkillRegistry({ extractRoot: root })
    r.register({ ...BASE, files: { 'a.md': 'x' } })
    await r.invoke('demo', { args: '', messages: [] })
    const { stat } = await import('node:fs/promises')
    const st = await stat(join(extractDirFor(root, 'demo'), 'a.md'))
    expect(st.mode & 0o777).toBe(0o600)
  })
})

describe('el registro (T-070)', () => {
  test('rehusa un nombre duplicado en vez de pisarlo en silencio', () => {
    const r = new SkillRegistry()
    r.register(BASE)
    expect(() => r.register({ ...BASE, description: 'otro' })).toThrow(/demo/)
  })

  test('rehusa un nombre que no es un segmento de ruta', () => {
    const r = new SkillRegistry()
    expect(() => r.register({ ...BASE, name: '../evasion' })).toThrow(/nombre/)
    expect(() => r.register({ ...BASE, name: 'con espacio' })).toThrow(/nombre/)
  })

  test('`isEnabled` decide si el skill se lista', () => {
    const r = new SkillRegistry()
    r.register({ ...BASE, name: 'si', isEnabled: () => true })
    r.register({ ...BASE, name: 'no', isEnabled: () => false })
    r.register({ ...BASE, name: 'sin-predicado' })
    expect(r.list().map((s) => s.name).sort()).toEqual(['si', 'sin-predicado'])
    // Deshabilitado NO es inexistente: `get` lo devuelve, invocarlo no.
    expect(r.get('no')?.name).toBe('no')
  })

  test('invocar un skill deshabilitado o inexistente falla con su nombre', async () => {
    const r = new SkillRegistry()
    r.register({ ...BASE, name: 'no', isEnabled: () => false })
    await expect(r.invoke('no', { args: '', messages: [] })).rejects.toThrow(/no/)
    await expect(r.invoke('fantasma', { args: '', messages: [] })).rejects.toThrow(/fantasma/)
  })

  test('el directorio de extraccion lleva un nonce por proceso', () => {
    const a = new SkillRegistry()
    const b = new SkillRegistry()
    // Dos registros no comparten raiz: un atacante que adivine el nombre del
    // skill no puede pre-crear el arbol, que es la defensa que carga el peso.
    expect(a.root).not.toBe(b.root)
    expect(a.root).toMatch(/[0-9a-f]{16,}/)
  })

  test('el nombre del skill no se concatena crudo a la raiz', async () => {
    const root = await raiz()
    // `extractDirFor` es la unica via al directorio, y valida su entrada.
    expect(() => extractDirFor(root, '../fuera')).toThrow(/nombre/)
  })
})
