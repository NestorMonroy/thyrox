/**
 * Lectura de encabezados ELF64, a mano.
 *
 * Se lee el formato directamente en vez de invocar `readelf` o `objdump`
 * porque el analisis tiene que correr sin binutils y sin red, y porque la
 * salida de esas herramientas es texto que habria que analizar de todos modos.
 *
 * Los desplazamientos son los del gABI (ELF64, little-endian):
 *
 *   0x28  e_shoff      u64  donde arranca la tabla de secciones
 *   0x3A  e_shentsize  u16  cuanto mide cada entrada
 *   0x3C  e_shnum      u16  cuantas entradas hay
 *   0x3E  e_shstrndx   u16  cual de ellas guarda los nombres
 *
 * y dentro de cada entrada de seccion:
 *
 *   0x00  sh_name      u32  indice en la tabla de nombres
 *   0x18  sh_offset    u64  donde arranca la seccion en el archivo
 *   0x20  sh_size      u64  cuanto mide
 */

/** Una seccion localizada: donde empieza en el archivo y cuanto ocupa. */
export type Section = { offset: number; size: number }

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]) // "\x7fELF"

/** Si el buffer arranca con el magic de ELF. No valida nada mas. */
export function isElf(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes.subarray(0, 4).equals(ELF_MAGIC)
}

/**
 * Localiza una seccion por su nombre. `null` si el archivo no es ELF o si la
 * seccion no esta declarada.
 *
 * Devolver `null` y no lanzar es deliberado: quien llama decide si la ausencia
 * es un error o un caso previsto, y un `null` no se puede confundir con una
 * lectura valida — que es lo que un offset 0 si haria.
 */
export function findSection(bytes: Buffer, name: string): Section | null {
  if (!isElf(bytes)) return null

  const shoff = Number(bytes.readBigUInt64LE(0x28))
  const shentsize = bytes.readUInt16LE(0x3a)
  const shnum = bytes.readUInt16LE(0x3c)
  const shstrndx = bytes.readUInt16LE(0x3e)
  if (shoff <= 0 || shentsize <= 0 || shnum <= 0) return null

  // La seccion de nombres: su sh_offset es la base de todos los sh_name.
  const strTableOffset = Number(bytes.readBigUInt64LE(shoff + shstrndx * shentsize + 0x18))
  const buscado = Buffer.from(name, 'utf8')

  for (let i = 0; i < shnum; i++) {
    const base = shoff + i * shentsize
    if (base + shentsize > bytes.length) return null
    const shName = bytes.readUInt32LE(base)
    const inicio = strTableOffset + shName
    const fin = bytes.indexOf(0, inicio)
    if (fin < 0) continue
    if (bytes.subarray(inicio, fin).equals(buscado)) {
      return {
        offset: Number(bytes.readBigUInt64LE(base + 0x18)),
        size: Number(bytes.readBigUInt64LE(base + 0x20)),
      }
    }
  }
  return null
}
