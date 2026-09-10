/**
 * Porte de `ccnmt: packages/agent/__tests__/isEmptyMessageText.test.ts`.
 *
 * `stripPromptXMLTags` retira cuatro familias de etiqueta del prompt:
 * `<commit_analysis>`, `<context>`, `<function_analysis>` y `<pr_analysis>`.
 * Son envoltorios de INYECCION DE PROMPT —ordenes del sistema—, no etiquetas
 * de presentacion, que se retiran con otro mecanismo del paquete de salida.
 *
 * `isEmptyMessageText` es cierto cuando el texto queda en blanco tras retirar
 * esos envoltorios, o cuando es exactamente el centinela `NO_CONTENT_MESSAGE`.
 *
 * Equivocarse tiene las dos formas caras: mensajes vacios que se cuelan al
 * transcript —tokens gastados en marcadores «(no content)»— o mensajes con
 * contenido real que se filtran fuera, y entonces el usuario cree que el
 * modelo no respondio.
 */
import { describe, expect, test } from 'bun:test'
import { isEmptyMessageText, stripPromptXMLTags } from '../messages.ts'
import { NO_CONTENT_MESSAGE } from '../constants/messages.ts'

describe('stripPromptXMLTags retira cuatro familias de etiqueta', () => {
  test('retira <commit_analysis>...</commit_analysis>', () => {
    expect(
      stripPromptXMLTags('<commit_analysis>git stuff</commit_analysis>'),
    ).toBe('')
  })

  test('retira <context>...</context>', () => {
    expect(stripPromptXMLTags('<context>file info</context>')).toBe('')
  })

  test('retira <function_analysis>...</function_analysis>', () => {
    expect(
      stripPromptXMLTags('<function_analysis>code</function_analysis>'),
    ).toBe('')
  })

  test('retira <pr_analysis>...</pr_analysis>', () => {
    expect(stripPromptXMLTags('<pr_analysis>PR review</pr_analysis>')).toBe('')
  })

  test('retira varias familias presentes en la misma entrada', () => {
    expect(
      stripPromptXMLTags(
        '<context>x</context><commit_analysis>y</commit_analysis>',
      ),
    ).toBe('')
  })

  test('conserva el contenido que queda fuera del envoltorio', () => {
    expect(
      stripPromptXMLTags(
        'real text<context>system context</context>more text',
      ),
    ).toBe('real textmore text')
  })

  test('si fuera del envoltorio solo hay espacios, recorta', () => {
    expect(
      stripPromptXMLTags('   <context>x</context>   '),
    ).toBe('')
  })

  test('retira el envoltorio aunque su contenido ocupe varias lineas', () => {
    expect(
      stripPromptXMLTags(
        '<context>\nline1\nline2\n</context>',
      ),
    ).toBe('')
  })

  test('conserva una etiqueta que no esta en las cuatro, como <thinking>', () => {
    expect(
      stripPromptXMLTags('<thinking>kept</thinking>'),
    ).toBe('<thinking>kept</thinking>')
  })

  test('el texto llano pasa sin cambios', () => {
    expect(stripPromptXMLTags('hello world')).toBe('hello world')
  })

  test('la cadena vacia devuelve cadena vacia', () => {
    expect(stripPromptXMLTags('')).toBe('')
  })

  test('solo espacios devuelve cadena vacia por el recorte', () => {
    expect(stripPromptXMLTags('   \n\t  ')).toBe('')
  })
})

describe('isEmptyMessageText — los casos ciertos', () => {
  test('la cadena vacia es vacia', () => {
    expect(isEmptyMessageText('')).toBe(true)
  })

  test('solo espacios es vacio', () => {
    expect(isEmptyMessageText('   \n\t  ')).toBe(true)
  })

  test('solo etiquetas retiradas es vacio', () => {
    expect(
      isEmptyMessageText('<context>system info</context>'),
    ).toBe(true)
  })

  test('solo varias etiquetas retiradas es vacio', () => {
    expect(
      isEmptyMessageText(
        '<context>x</context>\n<commit_analysis>y</commit_analysis>',
      ),
    ).toBe(true)
  })

  test('el centinela NO_CONTENT_MESSAGE es vacio', () => {
    expect(isEmptyMessageText(NO_CONTENT_MESSAGE)).toBe(true)
  })

  test('el centinela con espacios alrededor sigue siendo vacio', () => {
    expect(isEmptyMessageText(`   ${NO_CONTENT_MESSAGE}   `)).toBe(true)
  })
})

describe('isEmptyMessageText — los casos falsos', () => {
  test('el texto llano no es vacio', () => {
    expect(isEmptyMessageText('hello')).toBe(false)
  })

  test('etiquetas retiradas mas contenido real no es vacio', () => {
    expect(
      isEmptyMessageText('<context>x</context>real content'),
    ).toBe(false)
  })

  test('una etiqueta que no se retira, como <thinking>, no es vacio', () => {
    expect(
      isEmptyMessageText('<thinking>preserved content</thinking>'),
    ).toBe(false)
  })

  test('el centinela como subcadena no cuenta: solo la coincidencia exacta', () => {
    // Fijado: solo la coincidencia EXACTA del centinela tras recortar cuenta.
    // Cualquier texto adyacente lo descalifica.
    expect(
      isEmptyMessageText(`prefix ${NO_CONTENT_MESSAGE}`),
    ).toBe(false)
  })

  test('la coincidencia del centinela distingue caja', () => {
    expect(isEmptyMessageText('(NO CONTENT)')).toBe(false)
  })

  test('un solo caracter no es vacio', () => {
    expect(isEmptyMessageText('x')).toBe(false)
  })
})

describe('forma del valor devuelto', () => {
  test('isEmptyMessageText devuelve siempre un booleano', () => {
    const samples = ['', 'hello', NO_CONTENT_MESSAGE, '<context>x</context>']
    for (const s of samples) {
      expect(typeof isEmptyMessageText(s)).toBe('boolean')
    }
  })

  test('stripPromptXMLTags devuelve siempre una cadena', () => {
    const samples = ['', 'hello', '<context>x</context>', 'before<context>y</context>after']
    for (const s of samples) {
      expect(typeof stripPromptXMLTags(s)).toBe('string')
    }
  })
})
