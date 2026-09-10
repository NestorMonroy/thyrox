/**
 * Tests del reformateador — la etapa que hace citable el payload.
 *
 * Fuente del problema, medida sobre `chunk-vw215j9f.js` de la build 2.1.258:
 * 5 493 162 bytes en **5242 lineas** (1048 B de ancho medio), con lineas
 * sueltas de 224 061 B. Un `grep -n` sobre eso devuelve una linea de 224 KB:
 * el numero de linea no localiza nada, y por eso toda cita del binario en esta
 * sesion tuvo que hacerse con ventanas `grep -oE '.{160}…'`.
 *
 * Los casos de trampa NO son inventados: cada uno se extrajo del propio chunk
 * con un patron, y el comentario dice cual. Un caso fabricado por quien
 * escribe el reformateador hereda su encuadre y confirma el instrumento
 * (`hallazgo-abierto-genera-sucesor.md`).
 *
 * Lo que el reformateador NO hace, y es deliberado: renombrar, reordenar ni
 * plegar. Su unica garantia es que el texto sin espacio en blanco no cambia —
 * eso es lo que lo hace verificable sin un analizador de JavaScript.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { reflow, stripWhitespace } from '../src/reflow.ts'

/** El invariante que define la etapa: cambia el espacio, nada mas. */
function preservaTexto(src: string): boolean {
  return stripWhitespace(reflow(src)) === stripWhitespace(src)
}

describe('invariante — solo cambia el espacio en blanco', () => {
  test('un programa trivial sobrevive', () => {
    expect(preservaTexto('var a=1;var b=2;')).toBe(true)
  })

  test('el texto queda en mas lineas de las que entro', () => {
    expect(reflow('var a=1;var b=2;').split('\n').length).toBeGreaterThan(1)
  })
})

describe('trampas reales del chunk (build 2.1.258)', () => {
  // Extraido con /\([^()]{0,40}\/[^\/\n]{2,30}\/[gimsuy]*[.)]/ — una expresion
  // regular cuyo cuerpo trae `{`, `}` y `[`. Partir por esos signos la rompe.
  test('regex con llaves en el cuerpo', () => {
    const src = 'if(/[?*+@!()[\\]{}]/.test(x)){y()}'
    expect(preservaTexto(src)).toBe(true)
    expect(reflow(src)).toContain('/[?*+@!()[\\]{}]/')
  })

  // Extraido con /\w+ ?\/ ?\w+[;,)]/ — aqui `/` es division, no regex. El
  // discriminador es el token anterior: tras `)`/identificador/numero divide.
  test('division no se confunde con regex', () => {
    expect(preservaTexto('var q=total/n;f(a/b);')).toBe(true)
  })

  // Extraido con /`[^`\n]{0,60}\$\{[^}]{1,40}\}[^`\n]{0,40}`/ — el `}` que
  // cierra la interpolacion NO es un cierre de bloque.
  test('template con interpolacion', () => {
    const src = 'var s=`))${e.STAR})`;'
    expect(preservaTexto(src)).toBe(true)
    expect(reflow(src)).toContain('`))${e.STAR})`')
  })

  // Extraido con /"[^"\n]{0,30};[^"\n]{0,30}"/ — el `;` vive dentro de una
  // cadena. Partir ahi produce codigo que no analiza.
  test('punto y coma dentro de cadena', () => {
    const src = 'var i="\\";import{M}from\\"";'
    expect(preservaTexto(src)).toBe(true)
    expect(reflow(src).split('\n').filter(l => l.includes('import{M}')).length).toBe(1)
  })

  // Extraido con /'[^'\n]{0,30}\}[^'\n]{0,30}'/ — `}` dentro de comilla simple.
  test('llave dentro de cadena simple', () => {
    expect(preservaTexto("var t='${e}';var u=1;")).toBe(true)
  })

  test('comentarios de linea y de bloque', () => {
    const src = 'var a=1;// no;partir{aqui\nvar b=2;/* ni;aqui{ */var c=3;'
    expect(preservaTexto(src)).toBe(true)
  })
})

describe('la sangria refleja el anidamiento', () => {
  test('un bloque interno sangra mas que su llave', () => {
    const salida = reflow('function f(){if(a){b()}}').split('\n')
    const sangria = (l: string) => l.length - l.trimStart().length
    const cuerpo = salida.filter(l => l.includes('b()'))[0]
    expect(sangria(cuerpo)).toBeGreaterThan(0)
  })

  test('el cierre vuelve al nivel de su apertura', () => {
    const salida = reflow('function f(){g()}').split('\n')
    const abre = salida.findIndex(l => l.includes('function f()'))
    const cierra = salida.length - 1 - [...salida].reverse().findIndex(l => l.trim() === '}')
    const sangria = (l: string) => l.length - l.trimStart().length
    expect(sangria(salida[cierra])).toBe(sangria(salida[abre]))
  })
})

describe('control sobre el chunk real, si esta', () => {
  const ruta = '/tmp/big.js'
  const hay = existsSync(ruta)

  test.if(hay)('el chunk de 5.5 MB conserva su texto y gana lineas', () => {
    // El control que importa: el invariante se sostiene sobre 5 493 162 bytes
    // de codigo real, no sobre los ocho casos de arriba.
    const src = readFileSync(ruta, 'utf8')
    const salida = reflow(src)
    expect(stripWhitespace(salida)).toBe(stripWhitespace(src))
    expect(salida.split('\n').length).toBeGreaterThan(src.split('\n').length * 10)
  }, 120_000)
})
