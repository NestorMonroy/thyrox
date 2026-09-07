import { basename } from 'node:path'
import type { CommandDefinition } from '../types.ts'

/**
 * Lee un `.md` de comando y devuelve su definicion. Es la mitad de IMPORTAR
 * del sustrato: existe para que las 27 definiciones se deriven del disco en
 * vez de transcribirse a mano — 27 transcripciones es donde entra el error
 * que nadie ve.
 *
 * El `id` sale del NOMBRE DEL ARCHIVO, no del frontmatter: es la diferencia
 * medida con el skill, y la razon de que esta funcion reciba el nombre del
 * archivo ademas de su contenido.
 *
 * NO es un parser de YAML: los 27 declaran solo claves escalares de primer
 * nivel, medido. Ante un bloque anidado —que hoy no existe en ninguno— esta
 * funcion lo dejaria caer en silencio, y por eso el control de ida y vuelta
 * es byte a byte: un archivo con una clave que esta funcion no sepa leer NO
 * se reemite igual, y el control cae.
 */
export function parseCommand(fileName: string, raw: string): CommandDefinition {
  const id = basename(fileName, '.md')

  if (!raw.startsWith('---\n')) {
    // Sin frontmatter el archivo es prompt puro. Ninguno de los 27 esta en
    // este caso; se admite para no perder un archivo que llegue despues.
    return { id, prompt: raw }
  }

  const cierre = raw.indexOf('\n---\n', 3)
  if (cierre === -1) return { id, prompt: raw }

  const frontmatter = raw.slice(4, cierre + 1)
  const prompt = raw.slice(cierre + 5)
  const definicion: CommandDefinition = { id, prompt }

  for (const linea of frontmatter.split('\n')) {
    const sep = linea.indexOf(':')
    if (sep === -1) continue
    const clave = linea.slice(0, sep)
    const valor = linea.slice(sep + 1).replace(/^ /, '')
    if (clave === 'name') definicion.name = valor
    else if (clave === 'description') definicion.description = valor
    else if (clave === 'argument-hint') definicion.argumentHint = valor
    else if (clave === 'allowed-tools') {
      definicion.allowedTools = valor.split(' ').filter((t) => t.length > 0)
    }
  }

  return definicion
}
