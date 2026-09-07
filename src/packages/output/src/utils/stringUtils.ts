/**
 * Puerto de `ccnmt: packages/output/src/utils/stringUtils.ts` (verbatim —
 * sin imports en la fuente).
 *
 * Funciones y clases utilitarias generales de cadena para acumulacion
 * segura de strings.
 */

/**
 * Escapa los caracteres especiales de regex en una cadena para poder
 * usarla como patron literal en un constructor RegExp.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pone en mayuscula el primer caracter de una cadena, dejando el resto
 * sin cambios. A diferencia de `capitalize` de lodash, esto NO pone en
 * minuscula el resto de los caracteres.
 *
 * @example capitalize('fooBar') → 'FooBar'
 * @example capitalize('hello world') → 'Hello world'
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Devuelve la forma singular o plural de una palabra segun el conteo.
 * Reemplaza el idiom en linea `word${n === 1 ? '' : 's'}`.
 *
 * @example plural(1, 'file') → 'file'
 * @example plural(3, 'file') → 'files'
 * @example plural(2, 'entry', 'entries') → 'entries'
 */
export function plural(
  n: number,
  word: string,
  pluralWord = word + 's',
): string {
  return n === 1 ? word : pluralWord
}

/**
 * Devuelve la primera linea de una cadena sin asignar un arreglo de
 * split. Se usa para detectar shebang al renderizar diffs.
 */
export function firstLineOf(s: string): string {
  const nl = s.indexOf('\n')
  return nl === -1 ? s : s.slice(0, nl)
}

/**
 * Cuenta las ocurrencias de `char` en `str` usando saltos de indexOf en
 * vez de iterar caracter por caracter. Tipado estructuralmente para que
 * Buffer tambien funcione (Buffer.indexOf acepta una cadena como aguja).
 */
export function countCharInString(
  str: { indexOf(search: string, start?: number): number },
  char: string,
  start = 0,
): number {
  let count = 0
  let i = str.indexOf(char, start)
  while (i !== -1) {
    count++
    i = str.indexOf(char, i + 1)
  }
  return count
}

/**
 * Normaliza digitos de ancho completo (zenkaku) a digitos de ancho medio.
 * Util para aceptar entrada de IMEs japones/CJK.
 */
export function normalizeFullWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  )
}

/**
 * Normaliza el espacio de ancho completo (zenkaku) a espacio de ancho
 * medio. Util para aceptar entrada de IMEs japones/CJK (U+3000 → U+0020).
 */
export function normalizeFullWidthSpace(input: string): string {
  return input.replace(/　/g, ' ')
}

// Mantiene la acumulacion en memoria modesta para no disparar el RSS.
// El desbordamiento mas alla de este limite lo derrama a disco ShellCommand.
const MAX_STRING_LENGTH = 2 ** 25

/**
 * Une de forma segura un arreglo de cadenas con un delimitador, truncando
 * si el resultado excede maxSize.
 *
 * @param lines Arreglo de cadenas a unir
 * @param delimiter Delimitador a usar entre cadenas (default: ',')
 * @param maxSize Tamano maximo de la cadena resultante
 * @returns La cadena unida, truncada si fue necesario
 */
export function safeJoinLines(
  lines: string[],
  delimiter: string = ',',
  maxSize: number = MAX_STRING_LENGTH,
): string {
  const truncationMarker = '...[truncated]'
  let result = ''

  for (const line of lines) {
    const delimiterToAdd = result ? delimiter : ''
    const fullAddition = delimiterToAdd + line

    if (result.length + fullAddition.length <= maxSize) {
      // La linea completa cabe
      result += fullAddition
    } else {
      // Hace falta truncar
      const remainingSpace =
        maxSize -
        result.length -
        delimiterToAdd.length -
        truncationMarker.length

      if (remainingSpace > 0) {
        // Agrega el delimitador y tanto de la linea como quepa
        result +=
          delimiterToAdd + line.slice(0, remainingSpace) + truncationMarker
      } else {
        // No hay espacio para nada de esta linea, solo agrega el marcador
        result += truncationMarker
      }
      return result
    }
  }
  return result
}

/**
 * Un acumulador de cadenas que maneja de forma segura salidas grandes,
 * truncando desde el final cuando se excede un limite de tamano. Esto
 * evita crashes por RangeError preservando el inicio de la salida.
 */
export class EndTruncatingAccumulator {
  private content: string = ''
  private isTruncated = false
  private totalBytesReceived = 0

  /**
   * Crea un nuevo EndTruncatingAccumulator
   * @param maxSize Tamano maximo en caracteres antes de truncar
   */
  constructor(private readonly maxSize: number = MAX_STRING_LENGTH) {}

  /**
   * Agrega datos al acumulador. Si el tamano total excede maxSize, el
   * final se trunca para mantener el limite de tamano.
   * @param data Los datos de cadena a agregar
   */
  append(data: string | Buffer): void {
    const str = typeof data === 'string' ? data : data.toString()
    this.totalBytesReceived += str.length

    // Si ya esta a capacidad y truncado, no modifica el contenido
    if (this.isTruncated && this.content.length >= this.maxSize) {
      return
    }

    // Verifica si agregar la cadena excederia el limite
    if (this.content.length + str.length > this.maxSize) {
      // Solo agrega lo que quepa
      const remainingSpace = this.maxSize - this.content.length
      if (remainingSpace > 0) {
        this.content += str.slice(0, remainingSpace)
      }
      this.isTruncated = true
    } else {
      this.content += str
    }
  }

  /**
   * Devuelve la cadena acumulada, con marcador de truncado si se trunco
   */
  toString(): string {
    if (!this.isTruncated) {
      return this.content
    }

    const truncatedBytes = this.totalBytesReceived - this.maxSize
    const truncatedKB = Math.round(truncatedBytes / 1024)
    return this.content + `\n... [output truncated - ${truncatedKB}KB removed]`
  }

  /**
   * Limpia todos los datos acumulados
   */
  clear(): void {
    this.content = ''
    this.isTruncated = false
    this.totalBytesReceived = 0
  }

  /**
   * Devuelve el tamano actual de los datos acumulados
   */
  get length(): number {
    return this.content.length
  }

  /**
   * Devuelve si ocurrio truncado
   */
  get truncated(): boolean {
    return this.isTruncated
  }

  /**
   * Devuelve el total de bytes recibidos (antes de truncar)
   */
  get totalBytes(): number {
    return this.totalBytesReceived
  }
}

/**
 * Trunca texto a un numero maximo de lineas, agregando puntos suspensivos
 * si se trunco.
 *
 * @param text El texto a truncar
 * @param maxLines Numero maximo de lineas a conservar
 * @returns El texto truncado con puntos suspensivos si se trunco
 */
export function truncateToLines(text: string, maxLines: number): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) {
    return text
  }
  return lines.slice(0, maxLines).join('\n') + '…'
}
