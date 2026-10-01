/**
 * Lectura de JSON con la semántica de gjson que el comparador LCP de
 * CLIProxyAPI necesita y `JSON.parse` pierde: el texto crudo de cada valor
 * (`Raw`: un `1.50` sigue siendo `1.50`), la primera clave cuando un objeto
 * la repite, `ForEach` sobre los valores de un objeto o sobre un escalar
 * suelto, y `Array()` de algo que no es lista.
 *
 * Divergencia declarada: se exige un primer valor JSON bien formado (lo que
 * le siga se ignora, como gjson). gjson recorre también documentos rotos y
 * extrae lo que alcanza; aquí un documento roto no da valor.
 */

export type RawNode =
  | { kind: 'string'; raw: string; value: string }
  | { kind: 'number'; raw: string; value: number }
  | { kind: 'true' | 'false' | 'null'; raw: string }
  | { kind: 'array'; raw: string; items: RawNode[] }
  | { kind: 'object'; raw: string; entries: [string, RawNode][] }

const WHITESPACE = new Set([' ', '\t', '\n', '\r'])

class Parser {
  private index = 0
  constructor(private readonly text: string) {}

  parse(): RawNode | undefined {
    try {
      this.skip()
      return this.value()
    } catch {
      return undefined
    }
  }

  private skip(): void {
    while (this.index < this.text.length && WHITESPACE.has(this.text[this.index]!)) this.index++
  }

  private fail(): never {
    throw new SyntaxError(`JSON inválido en ${this.index}`)
  }

  private value(): RawNode {
    const start = this.index
    const character = this.text[this.index]
    if (character === '{') return this.object(start)
    if (character === '[') return this.array(start)
    if (character === '"') {
      const raw = this.string()
      return { kind: 'string', raw, value: JSON.parse(raw) as string }
    }
    for (const literal of ['true', 'false', 'null'] as const) {
      if (this.text.startsWith(literal, this.index)) {
        this.index += literal.length
        return { kind: literal, raw: literal }
      }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.index, this.index + 400))
    if (!number) this.fail()
    this.index += number[0].length
    return { kind: 'number', raw: number[0], value: Number(number[0]) }
  }

  private string(): string {
    const start = this.index++
    while (this.index < this.text.length) {
      const character = this.text[this.index]!
      if (character === '\\') this.index += 2
      else if (character === '"') return this.text.slice(start, ++this.index)
      else if (character < ' ') this.fail()
      else this.index++
    }
    return this.fail()
  }

  private array(start: number): RawNode {
    this.index++
    const items: RawNode[] = []
    this.skip()
    if (this.text[this.index] === ']') {
      this.index++
      return { kind: 'array', raw: this.text.slice(start, this.index), items }
    }
    for (;;) {
      this.skip()
      items.push(this.value())
      this.skip()
      const next = this.text[this.index++]
      if (next === ']') return { kind: 'array', raw: this.text.slice(start, this.index), items }
      if (next !== ',') this.fail()
    }
  }

  private object(start: number): RawNode {
    this.index++
    const entries: [string, RawNode][] = []
    this.skip()
    if (this.text[this.index] === '}') {
      this.index++
      return { kind: 'object', raw: this.text.slice(start, this.index), entries }
    }
    for (;;) {
      this.skip()
      if (this.text[this.index] !== '"') this.fail()
      const key = JSON.parse(this.string()) as string
      this.skip()
      if (this.text[this.index++] !== ':') this.fail()
      this.skip()
      entries.push([key, this.value()])
      this.skip()
      const next = this.text[this.index++]
      if (next === '}') return { kind: 'object', raw: this.text.slice(start, this.index), entries }
      if (next !== ',') this.fail()
    }
  }
}

/** `gjson.Parse`: el primer valor del texto, o `undefined` si no hay uno bien formado. */
export function parseRaw(text: string): RawNode | undefined {
  if (text.length === 0) return undefined
  return new Parser(text).parse()
}

/** `Get(key)`: la primera entrada con esa clave de un objeto; nada en otro tipo. */
export function rawGet(node: RawNode | undefined, key: string): RawNode | undefined {
  if (node?.kind !== 'object') return undefined
  return node.entries.find(([name]) => name === key)?.[1]
}

/** `ForEach`: los elementos de una lista, los valores de un objeto, o el escalar mismo. */
export function rawEach(node: RawNode | undefined): RawNode[] {
  if (node === undefined) return []
  if (node.kind === 'array') return node.items
  if (node.kind === 'object') return node.entries.map(([, value]) => value)
  return [node]
}

/** `Array()`: la lista, vacío para `null`, o el valor solo. */
export function rawArray(node: RawNode | undefined): RawNode[] {
  if (node === undefined || node.kind === 'null') return []
  if (node.kind === 'array') return node.items
  return [node]
}

/** `String()` de gjson: el texto de una cadena, el crudo de lo demás, vacío para lo ausente o `null`. */
export function rawString(node: RawNode | undefined): string {
  if (node === undefined || node.kind === 'null') return ''
  if (node.kind === 'string') return node.value
  if (node.kind === 'number') return /^-?\d+$/.test(node.raw) ? node.raw : formatFloat(node.value)
  return node.raw
}

/** `strconv.FormatFloat(f, 'f', -1, 64)`: sin exponente, con los dígitos mínimos. */
function formatFloat(value: number): string {
  const shortest = String(value)
  const match = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(shortest)
  if (!match) return shortest
  const [, sign, lead, fraction = '', exponentText] = match
  const digits = lead! + fraction
  const exponent = Number(exponentText)
  if (exponent >= 0) return sign + digits.padEnd(exponent + 1, '0')
  return `${sign}0.${'0'.repeat(-exponent - 1)}${digits}`
}
