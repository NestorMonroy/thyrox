/**
 * La mitad ROJA de `semanticNumber`.
 *
 * Procedencia del SUJETO: `ccnmt: packages/tool-registry/src/utils/semanticNumber.ts`.
 * Los casos son propios —no se copian los de su `__tests__`, que ese árbol
 * declara `"license": "UNLICENSED"`— y cubren el mismo contrato.
 *
 * QUÉ SE MIDE. Igual que en su hermano booleano, el valor está en lo que
 * RECHAZA: `z.coerce.number()` convertiría `""`, `null` y `false` en `0`, y
 * `true` en `1`. Un cero fabricado a partir de una entrada vacía no es
 * tolerancia: es un defecto entregado como dato bueno.
 *
 * Tres costuras con anulación, y las tres se corrieron:
 *
 * 1. **El anclaje de la expresión regular** — `^…$`. Anulación: quitarlos y
 *    caen **5** casos: el relleno `"  30  "` y los cuatro de forma, porque sin
 *    anclas basta con que haya un dígito en cualquier parte.
 * 2. **La forma decimal estricta** — sin exponente, sin hexadecimal, sin signo
 *    explícito, con parte entera y parte decimal a los dos lados del punto.
 *    Anulación: sustituirla por `/^[-+]?[\dxXeE.]+$/` y caen **4** casos:
 *    `"1e5"`, `"0x10"`, `"+5"` y el par `".5"`/`"5."`.
 * 3. **La guarda `Number.isFinite`** — un entero de 400 dígitos pasa la
 *    expresión y `Number()` lo desborda a `Infinity`; con la guarda el
 *    preprocesador devuelve la cadena ORIGINAL en vez del `Infinity`.
 *    Anulación: quitarla y cae **1** caso, el del esquema interno permisivo.
 *    Con el interno por defecto NO cae ninguno, y eso está medido: zod v4
 *    rechaza `Infinity` en `z.number()` por su cuenta
 *    (`z.number().safeParse(Infinity).success === false`), así que ahí la
 *    guarda y el esquema coinciden en el veredicto y el control no las
 *    separa. Por eso el caso que la mide usa `z.union([z.number(),
 *    z.string()])`: es el único interno bajo el cual la guarda decide sola.
 *
 * Lo que NO cae en ninguna de las tres es `"1.2.3"`, `"abc"`, `"5px"`,
 * `"Infinity"` y `"NaN"`: pasan tal cual y los rechaza el esquema interno.
 * Están aquí para fijar ESE reparto — la expresión filtra, no valida.
 *
 * Métrica: `safeParse` sobre literales decimales y sobre las doce formas de
 * cadena que la expresión no admite, más el JSON Schema emitido.
 * Ciega a: la precisión de `Number()` sobre decimales largos — eso es
 * aritmética de coma flotante, no de este esquema.
 */
import { describe, expect, test } from 'bun:test'
import { z } from 'zod/v4'
import { semanticNumber } from '../semanticNumber.js'

describe('semanticNumber — lo que acepta', () => {
  test('un número de verdad pasa tal cual', () => {
    expect(semanticNumber().parse(30)).toBe(30)
    expect(semanticNumber().parse(-5)).toBe(-5)
    expect(semanticNumber().parse(0)).toBe(0)
    expect(semanticNumber().parse(3.14)).toBe(3.14)
  })

  test('convierte el literal decimal en cadena', () => {
    expect(semanticNumber().parse('30')).toBe(30)
    expect(semanticNumber().parse('-5')).toBe(-5)
    expect(semanticNumber().parse('0')).toBe(0)
    expect(semanticNumber().parse('3.14')).toBe(3.14)
  })
})

describe('semanticNumber — lo que rechaza (que es el punto)', () => {
  test('lo que `z.coerce.number()` convertiría en 0 o en 1', () => {
    // Los cuatro que hacen del módulo algo distinto de `z.coerce`.
    for (const v of ['', null, false, true]) {
      expect(semanticNumber().safeParse(v).success).toBe(false)
    }
  })

  test('cadena de sólo espacios', () => {
    expect(semanticNumber().safeParse('   ').success).toBe(false)
  })

  test('cadena con relleno alrededor del número', () => {
    expect(semanticNumber().safeParse('  30  ').success).toBe(false)
  })

  test('notación científica', () => {
    expect(semanticNumber().safeParse('1e5').success).toBe(false)
  })

  test('hexadecimal', () => {
    expect(semanticNumber().safeParse('0x10').success).toBe(false)
  })

  test('signo positivo explícito', () => {
    expect(semanticNumber().safeParse('+5').success).toBe(false)
  })

  test('punto sin parte entera, y punto sin parte decimal', () => {
    expect(semanticNumber().safeParse('.5').success).toBe(false)
    expect(semanticNumber().safeParse('5.').success).toBe(false)
  })

  test('más de un punto', () => {
    expect(semanticNumber().safeParse('1.2.3').success).toBe(false)
  })

  test('cadenas no numéricas, incluidas las que `Number()` sí entiende', () => {
    for (const v of ['abc', '5px', 'Infinity', 'NaN']) {
      expect(semanticNumber().safeParse(v).success).toBe(false)
    }
  })

  test('un entero tan grande que `Number()` lo desborda a Infinity', () => {
    // Pasa la expresión —son todo dígitos— y alcanza `Number.isFinite`. Con
    // el interno por defecto el rechazo está SOBREDETERMINADO: lo firmarían
    // tanto la guarda como `z.number()`, que en zod v4 no admite `Infinity`.
    // Este caso fija el veredicto, no atribuye la causa; quién decide lo mide
    // el de abajo.
    expect(semanticNumber().safeParse('9'.repeat(400)).success).toBe(false)
  })
})

describe('semanticNumber — la guarda del desbordamiento', () => {
  test('con un interno permisivo, el desbordado vuelve como la cadena original', () => {
    // El único interno bajo el cual la guarda decide sola. Con ella el
    // preprocesador devuelve la cadena; sin ella devolvería `Infinity`, que
    // ninguna rama de la unión acepta, y el parse entero fallaría.
    const grande = '9'.repeat(400)
    const permisivo = semanticNumber(z.union([z.number(), z.string()]))
    const r = permisivo.safeParse(grande)
    expect(r.success).toBe(true)
    expect(r.data).toBe(grande)
  })
})

describe('semanticNumber — con el modificador DENTRO', () => {
  test('con `.optional()`, undefined pasa y devuelve undefined', () => {
    expect(semanticNumber(z.number().optional()).parse(undefined)).toBeUndefined()
  })

  test('con `.optional()`, la cadena sigue convirtiéndose', () => {
    expect(semanticNumber(z.number().optional()).parse('30')).toBe(30)
  })

  test('con `.default(0)`, undefined toma el valor por defecto', () => {
    expect(semanticNumber(z.number().default(7)).parse(undefined)).toBe(7)
  })

  test('con `.default(0)`, la cadena gana sobre el defecto', () => {
    expect(semanticNumber(z.number().default(7)).parse('30')).toBe(30)
  })
})

describe('semanticNumber — lo que se le anuncia al modelo', () => {
  test('el JSON Schema dice number: la tolerancia es invisible', () => {
    const esquema = z.toJSONSchema(semanticNumber(), { io: 'input' }) as {
      type?: string
    }
    expect(esquema.type).toBe('number')
  })
})
