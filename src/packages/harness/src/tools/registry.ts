/**
 * Registro de herramientas (T-005) y las seis del núcleo (T-010).
 *
 * Una herramienta declara lo que el modelo ve —nombre, descripción, esquema
 * de entrada— y lo que el harness necesita para ejecutarla: el permiso que la
 * puerta evalúa y la función que la corre. Los dos planos van juntos en la
 * definición y se separan al enviar: `toolSpecs` entrega al modelo sólo su
 * mitad. El permiso no viaja en la petición porque no es asunto del modelo.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import type { Tool, ToolContext, ToolResult, ToolSpec } from '../types.ts'

const ok = (content: string): ToolResult => ({ content, isError: false })
const err = (content: string): ToolResult => ({ content, isError: true })

/** Exige una cadena no vacía; devuelve el error de entrada en vez de lanzar. */
function texto(input: Record<string, unknown>, campo: string): string | ToolResult {
  const v = input[campo]
  if (typeof v !== 'string' || v === '') return err(`falta el campo obligatorio '${campo}'`)
  return v
}

function esError(v: unknown): v is ToolResult {
  return typeof v === 'object' && v !== null && 'isError' in v
}

/** Resuelve una ruta contra el cwd de la sesión: las relativas son del agente. */
function ruta(p: string, ctx: ToolContext): string {
  return isAbsolute(p) ? p : join(ctx.cwd, p)
}

async function shell(command: string, ctx: ToolContext, timeoutMs = 120_000): Promise<ToolResult> {
  const proc = Bun.spawn(['bash', '-lc', command], { cwd: ctx.cwd, stdout: 'pipe', stderr: 'pipe' })
  let vencido = false
  const t = setTimeout(() => {
    vencido = true
    proc.kill(9)
  }, timeoutMs)
  const code = await proc.exited
  clearTimeout(t)
  const salida = `${await new Response(proc.stdout).text()}${await new Response(proc.stderr).text()}`
  if (vencido) return err(`${salida}\n[cortado tras ${timeoutMs / 1000}s]`)
  return code === 0 ? ok(salida) : err(`${salida}\n[exit ${code}]`)
}

export const bashTool: Tool = {
  name: 'Bash',
  description: 'Ejecuta un comando de shell en el directorio de trabajo de la sesión y devuelve su salida combinada. Un código de salida distinto de 0 se entrega como error.',
  permission: 'execute',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'El comando a ejecutar' },
      timeout_ms: { type: 'number', description: 'Milisegundos antes de cortarlo (por defecto 120000)' },
    },
    required: ['command'],
  },
  async run(input, ctx) {
    const c = texto(input, 'command')
    if (esError(c)) return c
    const ms = typeof input.timeout_ms === 'number' ? input.timeout_ms : 120_000
    return shell(c, ctx, ms)
  },
}

export const readTool: Tool = {
  name: 'Read',
  description: 'Lee un archivo del disco y devuelve su contenido completo como texto. La ruta relativa se resuelve contra el directorio de la sesión.',
  permission: 'read',
  input_schema: {
    type: 'object',
    properties: { file_path: { type: 'string', description: 'Ruta del archivo' } },
    required: ['file_path'],
  },
  async run(input, ctx) {
    const p = texto(input, 'file_path')
    if (esError(p)) return p
    try {
      return ok(readFileSync(ruta(p, ctx), 'utf8'))
    } catch (e) {
      return err(`no se pudo leer ${p}: ${(e as Error).message}`)
    }
  },
}

export const writeTool: Tool = {
  name: 'Write',
  description: 'Escribe un archivo completo, creando los directorios que falten. Sobrescribe si ya existe.',
  permission: 'write',
  input_schema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Ruta del archivo' },
      content: { type: 'string', description: 'Contenido completo' },
    },
    required: ['file_path', 'content'],
  },
  async run(input, ctx) {
    const p = texto(input, 'file_path')
    if (esError(p)) return p
    const c = input.content
    if (typeof c !== 'string') return err("falta el campo obligatorio 'content'")
    try {
      const destino = ruta(p, ctx)
      mkdirSync(dirname(destino), { recursive: true })
      writeFileSync(destino, c, 'utf8')
      return ok(`escrito ${destino} (${c.length} caracteres)`)
    } catch (e) {
      return err(`no se pudo escribir ${p}: ${(e as Error).message}`)
    }
  },
}

export const editTool: Tool = {
  name: 'Edit',
  description: 'Sustituye una cadena por otra dentro de un archivo. Rehúsa si la cadena aparece más de una vez: la ambigüedad la resuelve quien edita, no la herramienta.',
  permission: 'write',
  input_schema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Ruta del archivo' },
      old_string: { type: 'string', description: 'Cadena a sustituir, única en el archivo' },
      new_string: { type: 'string', description: 'Cadena nueva' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
  async run(input, ctx) {
    const p = texto(input, 'file_path')
    if (esError(p)) return p
    const viejo = texto(input, 'old_string')
    if (esError(viejo)) return viejo
    const nuevo = input.new_string
    if (typeof nuevo !== 'string') return err("falta el campo obligatorio 'new_string'")
    let actual: string
    try {
      actual = readFileSync(ruta(p, ctx), 'utf8')
    } catch (e) {
      return err(`no se pudo leer ${p}: ${(e as Error).message}`)
    }
    const veces = actual.split(viejo).length - 1
    if (veces === 0) return err(`la cadena no aparece en ${p}`)
    if (veces > 1) return err(`la cadena aparece ${veces} veces en ${p}; hace falta una única`)
    writeFileSync(ruta(p, ctx), actual.replace(viejo, nuevo), 'utf8')
    return ok(`editado ${p}`)
  },
}

export const globTool: Tool = {
  name: 'Glob',
  description: 'Lista los archivos que casan con un patrón, relativo al directorio de la sesión. Devuelve una ruta por línea.',
  permission: 'read',
  input_schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Patrón, por ejemplo **/*.ts' },
      path: { type: 'string', description: 'Raíz de la búsqueda (por defecto, el cwd)' },
    },
    required: ['pattern'],
  },
  async run(input, ctx) {
    const patron = texto(input, 'pattern')
    if (esError(patron)) return patron
    const raiz = typeof input.path === 'string' && input.path ? ruta(input.path, ctx) : ctx.cwd
    const encontrados: string[] = []
    for await (const f of new Bun.Glob(patron).scan({ cwd: raiz, onlyFiles: true })) encontrados.push(f)
    encontrados.sort()
    return ok(encontrados.join('\n') || '(sin coincidencias)')
  },
}

export const grepTool: Tool = {
  name: 'Grep',
  description: 'Busca un patrón en los archivos bajo el directorio de la sesión y devuelve las líneas que casan, con su archivo.',
  permission: 'read',
  input_schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Expresión regular' },
      path: { type: 'string', description: 'Archivo o directorio donde buscar' },
      glob: { type: 'string', description: 'Filtro de archivos, por ejemplo *.ts' },
    },
    required: ['pattern'],
  },
  async run(input, ctx) {
    const patron = texto(input, 'pattern')
    if (esError(patron)) return patron
    const donde = typeof input.path === 'string' && input.path ? input.path : '.'
    const filtro = typeof input.glob === 'string' && input.glob ? `--include=${JSON.stringify(input.glob)}` : ''
    const r = await shell(`grep -rnE ${JSON.stringify(patron)} ${filtro} ${JSON.stringify(donde)}`, ctx)
    // grep sale 1 cuando no hay coincidencias: no es un fallo de la herramienta
    if (r.isError && r.content.includes('[exit 1]')) return ok('(sin coincidencias)')
    return r
  },
}

export const CORE_TOOLS: Tool[] = [bashTool, readTool, writeTool, editTool, globTool, grepTool]

/** Índice por nombre, que es como llegan las llamadas del modelo. */
export function registry(tools: Tool[]): Map<string, Tool> {
  return new Map(tools.map((t) => [t.name, t]))
}

/** La mitad que el modelo ve. El permiso y la ejecución se quedan aquí. */
export function toolSpecs(tools: Tool[]): ToolSpec[] {
  return tools.map(({ name, description, input_schema }) => ({ name, description, input_schema }))
}
