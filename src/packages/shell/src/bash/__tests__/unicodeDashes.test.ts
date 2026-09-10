/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/bash/__tests__/unicodeDashes.test.ts`.
 */
import { expect, test } from 'bun:test'
import {
  sanitizeUnicodeDashes,
  sanitizeUnicodeDashesArgv,
} from '../unicodeDashes.js'

test('sanitizeUnicodeDashes normaliza en-dash a guion', () => {
  expect(sanitizeUnicodeDashes('rm –rf /')).toBe('rm -rf /')
})

test('sanitizeUnicodeDashes normaliza em-dash a guion', () => {
  expect(sanitizeUnicodeDashes('rm —rf /')).toBe('rm -rf /')
})

test('sanitizeUnicodeDashes normaliza barra horizontal a guion', () => {
  expect(sanitizeUnicodeDashes('rm ―rf /')).toBe('rm -rf /')
})

test('sanitizeUnicodeDashes deja intacto el guion ASCII', () => {
  expect(sanitizeUnicodeDashes('rm -rf /tmp/foo')).toBe('rm -rf /tmp/foo')
})

test('sanitizeUnicodeDashes maneja guiones mixtos en un comando', () => {
  expect(sanitizeUnicodeDashes('git push ——force')).toBe(
    'git push --force',
  )
})

test('sanitizeUnicodeDashesArgv normaliza cada elemento del argv', () => {
  expect(sanitizeUnicodeDashesArgv(['rm', '–rf', '/'])).toEqual([
    'rm',
    '-rf',
    '/',
  ])
})

test('sanitizeUnicodeDashes preserva caracteres unicode que no son guion', () => {
  expect(sanitizeUnicodeDashes('echo "café — menu"')).toBe(
    'echo "café - menu"',
  )
})

test('sanitizeUnicodeDashes maneja la cadena vacía', () => {
  expect(sanitizeUnicodeDashes('')).toBe('')
})

test('sanitizeUnicodeDashes NO toca alternativas del guion-menos (p. ej. U+2212 signo menos)', () => {
  expect(sanitizeUnicodeDashes('echo "5 − 3"')).toBe('echo "5 − 3"')
})

test('sanitizeUnicodeDashes devuelve el mismo contenido (entrada sin guiones)', () => {
  const input = 'just a normal sentence'
  expect(sanitizeUnicodeDashes(input)).toBe(input)
})

test('sanitizeUnicodeDashes es idempotente sobre una entrada ya saneada', () => {
  const once = sanitizeUnicodeDashes('rm –rf /')
  expect(sanitizeUnicodeDashes(once)).toBe(once)
})

test('sanitizeUnicodeDashesArgv maneja el arreglo vacío', () => {
  expect(sanitizeUnicodeDashesArgv([])).toEqual([])
})

test('sanitizeUnicodeDashesArgv preserva longitud y orden del arreglo', () => {
  expect(
    sanitizeUnicodeDashesArgv(['a', '–b', 'c', '—d', 'e']),
  ).toEqual(['a', '-b', 'c', '-d', 'e'])
})

test('sanitizeUnicodeDashesArgv devuelve un arreglo nuevo (no muta la entrada)', () => {
  const input = ['rm', '–rf']
  const output = sanitizeUnicodeDashesArgv(input)
  expect(output).not.toBe(input)
  expect(input).toEqual(['rm', '–rf'])
})

test('sanitizeUnicodeDashes maneja los tres caracteres de guion en una cadena', () => {
  expect(sanitizeUnicodeDashes('a–b—c―d')).toBe('a-b-c-d')
})
