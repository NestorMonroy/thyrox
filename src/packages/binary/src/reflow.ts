/**
 * Reformateador del payload minificado.
 *
 * El problema, medido sobre `chunk-vw215j9f.js` de 2.1.258: 5 493 162 bytes en
 * 5242 lineas, con lineas de hasta 224 061 B. Un `grep -n` ahi devuelve una
 * linea de 224 KB — el numero de linea no localiza nada, y una cita del binario
 * queda reducida a una ventana de caracteres alrededor del simbolo.
 *
 * Este modulo NO analiza JavaScript: lo recorre carácter a carácter llevando
 * cuenta del contexto lexico (cadena, plantilla, expresion regular,
 * comentario) y solo decide donde cabe un salto de linea. Esa modestia es lo
 * que lo hace verificable: su unica garantia es que el texto **sin espacio en
 * blanco** no cambia, y eso se comprueba sin un analizador.
 *
 * Lo que deliberadamente no hace: renombrar, reordenar, plegar ni corregir.
 * Cada una de esas cosas cambiaria el texto y disolveria la garantia.
 */

/** Todo el espacio en blanco fuera de cadenas y plantillas, retirado. */
export function stripWhitespace(src: string): string {
  const salida: string[] = []
  for (const t of scan(src)) {
    salida.push(t.kind === 'code' ? t.text.replace(/\s+/g, '') : t.text)
  }
  return salida.join('')
}

type Token = { kind: 'code' | 'string' | 'template' | 'regex' | 'comment'; text: string }

/**
 * Parte el fuente en tramos por contexto lexico.
 *
 * La ambigüedad de `/` — division o inicio de expresion regular — se resuelve
 * con el token anterior: tras algo que puede TERMINAR una expresion
 * (identificador, numero, `)`, `]`, cadena) divide; en cualquier otro sitio
 * abre una expresion regular. Es la heuristica estandar y es la unica parte de
 * este modulo que puede equivocarse; por eso el invariante se comprueba sobre
 * el chunk entero y no solo sobre casos escogidos.
 */
function* scan(src: string): Generator<Token> {
  let i = 0
  let codigo = ''
  /** Ultimo caracter significativo visto en contexto de codigo. */
  let previo = ''
  const emitirCodigo = function* () {
    if (codigo) {
      yield { kind: 'code', text: codigo } as Token
      codigo = ''
    }
  }

  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]

    if (c === '/' && d === '/') {
      yield* emitirCodigo()
      const fin = src.indexOf('\n', i)
      const hasta = fin < 0 ? src.length : fin
      yield { kind: 'comment', text: src.slice(i, hasta) }
      i = hasta
      continue
    }
    if (c === '/' && d === '*') {
      yield* emitirCodigo()
      const fin = src.indexOf('*/', i + 2)
      const hasta = fin < 0 ? src.length : fin + 2
      yield { kind: 'comment', text: src.slice(i, hasta) }
      i = hasta
      continue
    }
    if (c === '"' || c === "'") {
      yield* emitirCodigo()
      const fin = finDeCadena(src, i, c)
      yield { kind: 'string', text: src.slice(i, fin) }
      previo = '"'
      i = fin
      continue
    }
    if (c === '`') {
      yield* emitirCodigo()
      const fin = finDePlantilla(src, i)
      yield { kind: 'template', text: src.slice(i, fin) }
      previo = '`'
      i = fin
      continue
    }
    if (c === '/' && abreExpresionRegular(previo)) {
      const fin = finDeExpresionRegular(src, i)
      if (fin > i) {
        yield* emitirCodigo()
        yield { kind: 'regex', text: src.slice(i, fin) }
        previo = '/'
        i = fin
        continue
      }
    }
    codigo += c
    if (!/\s/.test(c)) previo = c
    i++
  }
  yield* emitirCodigo()
}

/** Tras estos, `/` es division; en cualquier otro sitio abre una regex. */
function abreExpresionRegular(previo: string): boolean {
  if (previo === '') return true
  return !/[\w$)\]"'`]/.test(previo)
}

function finDeCadena(src: string, i: number, comilla: string): number {
  let j = i + 1
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue }
    if (src[j] === comilla) return j + 1
    j++
  }
  return src.length
}

/** Recorre una plantilla contando la anidacion de `${…}`, que puede llevar otra. */
function finDePlantilla(src: string, i: number): number {
  let j = i + 1
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue }
    if (src[j] === '`') return j + 1
    if (src[j] === '$' && src[j + 1] === '{') {
      let nivel = 1
      j += 2
      while (j < src.length && nivel > 0) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '`') { j = finDePlantilla(src, j); continue }
        if (src[j] === '"' || src[j] === "'") { j = finDeCadena(src, j, src[j]); continue }
        if (src[j] === '{') nivel++
        else if (src[j] === '}') nivel--
        j++
      }
      continue
    }
    j++
  }
  return src.length
}

/** `0` si lo que sigue a `/` no cierra como expresion regular en su linea. */
function finDeExpresionRegular(src: string, i: number): number {
  let j = i + 1
  let enClase = false
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') { j += 2; continue }
    if (c === '\n') return 0
    if (enClase) { if (c === ']') enClase = false }
    else if (c === '[') enClase = true
    else if (c === '/') {
      j++
      while (j < src.length && /[a-z]/i.test(src[j])) j++
      return j
    }
    j++
  }
  return 0
}

const SANGRIA = '  '

/**
 * Devuelve el fuente con un salto de linea donde cabe uno.
 *
 * Los puntos de corte son `;` (fuera de la cabecera de un `for`), `{` y `}`.
 * La cabecera de un `for` se detecta por el nivel de parentesis: sus `;` no
 * separan sentencias.
 */
export function reflow(src: string): string {
  const partes: string[] = []
  let nivel = 0
  let parentesis = 0
  /** Cierto cuando lo ultimo emitido es el sangrado de una linea vacia. */
  let alInicio = true

  const nuevaLinea = (n = nivel) => {
    // Una linea en blanco no aporta y dos seguidas rompen la comparacion con
    // el fuente: si ya estamos al inicio, se corrige la sangria y no se abre
    // otra linea. La limpieza va AQUI y no en una pasada de expresiones
    // regulares al final — aquella tocaria tambien el interior de una
    // plantilla, que es texto del programa y no espacio de formato.
    if (alInicio) { partes[partes.length - 1] = '\n' + SANGRIA.repeat(Math.max(0, n)); return }
    while (partes.length > 0 && partes[partes.length - 1] === ' ') partes.pop()
    partes.push('\n' + SANGRIA.repeat(Math.max(0, n)))
    alInicio = true
  }
  const escribir = (t: string) => {
    partes.push(t)
    alInicio = false
  }

  for (const token of scan(src)) {
    if (token.kind !== 'code') {
      escribir(token.text)
      // Un comentario de linea se traga todo lo que le siga en su renglon. Sin
      // este salto el reformateo comenta codigo real — lo detecto el
      // invariante, no una lectura del codigo.
      if (token.kind === 'comment' && token.text.startsWith('//')) nuevaLinea()
      continue
    }

    for (const c of token.text) {
      if (/\s/.test(c)) {
        if (!alInicio) escribir(' ')
        continue
      }
      if (c === '(') { parentesis++; escribir(c); continue }
      if (c === ')') { parentesis = Math.max(0, parentesis - 1); escribir(c); continue }
      if (c === '{') { escribir(c); nivel++; nuevaLinea(); continue }
      if (c === '}') { nivel = Math.max(0, nivel - 1); nuevaLinea(); escribir(c); continue }
      if (c === ';' && parentesis === 0) { escribir(c); nuevaLinea(); continue }
      escribir(c)
    }
  }
  // Se retira el sangrado de la ultima linea si quedo vacia; nada mas.
  if (alInicio) partes.pop()
  return partes.join('')
}
