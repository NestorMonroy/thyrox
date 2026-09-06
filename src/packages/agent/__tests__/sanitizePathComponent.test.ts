/**
 * Porte de `ccnmt: packages/agent/__tests__/sanitizePathComponent.test.ts`.
 *
 * En la fuente el mecanismo vive dentro de `packages/agent/tasks.ts`, porque
 * su tablero escribe un archivo por tarea y el nombre del archivo ES el
 * identificador. Aqui vive suelto en el paquete agent, con el nombre del
 * simbolo, hasta que el porte del tablero (#160) le de su archivo: partir
 * `tasks.ts` antes de portarlo seria inventar la particion.
 */
import { describe, expect, test } from 'bun:test'
import { sanitizePathComponent } from '../src/sanitizePathComponent.ts'

describe('sanitizePathComponent — lo que la lista blanca admite', () => {
  test('lo alfanumerico pasa verbatim', () => {
    expect(sanitizePathComponent('abc123')).toBe('abc123')
    expect(sanitizePathComponent('XYZ')).toBe('XYZ')
  })
  test('conserva el guion', () => { expect(sanitizePathComponent('a-b-c')).toBe('a-b-c') })
  test('conserva el guion bajo', () => { expect(sanitizePathComponent('a_b_c')).toBe('a_b_c') })
  test('conserva la mezcla admitida', () => { expect(sanitizePathComponent('Task_123-abc')).toBe('Task_123-abc') })
  test('la cadena vacia queda vacia', () => { expect(sanitizePathComponent('')).toBe('') })
})

describe('sanitizePathComponent — los vectores de travesia', () => {
  test('la barra pasa a guion', () => { expect(sanitizePathComponent('a/b')).toBe('a-b') })
  test('la contrabarra pasa a guion', () => { expect(sanitizePathComponent('a\\b')).toBe('a-b') })
  test('el patron ../ colapsa a guiones', () => { expect(sanitizePathComponent('../etc')).toBe('---etc') })
  test('la travesia de Windows tambien', () => { expect(sanitizePathComponent('..\\Windows')).toBe('---Windows') })
  test('una ruta absoluta queda desarmada', () => { expect(sanitizePathComponent('/etc/passwd')).toBe('-etc-passwd') })
  test('el byte nulo pasa a guion: trunca cadenas en las llamadas al sistema', () => {
    expect(sanitizePathComponent('a\0b')).toBe('a-b')
  })
})

describe('sanitizePathComponent — los metacaracteres del interprete', () => {
  test('punto y coma', () => { expect(sanitizePathComponent('a;rm -rf /')).toBe('a-rm--rf--') })
  test('acento grave', () => { expect(sanitizePathComponent('a`whoami`')).toBe('a-whoami-') })
  test('signo de peso', () => { expect(sanitizePathComponent('$(echo hi)')).toBe('--echo-hi-') })
  test('barra vertical', () => { expect(sanitizePathComponent('a|b')).toBe('a-b') })
  test('salto de linea', () => { expect(sanitizePathComponent('a\nb')).toBe('a-b') })
  test('retorno y salto dan dos guiones', () => { expect(sanitizePathComponent('a\r\nb')).toBe('a--b') })
})

describe('sanitizePathComponent — Unicode y lo exotico', () => {
  test('los caracteres CJK no estan en la lista blanca', () => { expect(sanitizePathComponent('中文')).toBe('--') })
  test('un emoji son dos unidades de codigo y las dos caen', () => { expect(sanitizePathComponent('a🎉b')).toBe('a--b') })
  test('el latino acentuado tampoco esta en la lista', () => { expect(sanitizePathComponent('café')).toBe('caf-') })
  test('el espacio y el tabulador caen', () => { expect(sanitizePathComponent('a b\tc')).toBe('a-b-c') })
})

describe('sanitizePathComponent — es idempotente', () => {
  test('la salida saneada pasa verbatim en la segunda llamada', () => {
    const first = sanitizePathComponent('foo/bar baz')
    expect(sanitizePathComponent(first)).toBe(first)
  })
})
