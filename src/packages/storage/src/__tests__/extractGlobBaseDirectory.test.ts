/**
 * Tests para extractGlobBaseDirectory — helper puro que separa un patrón
 * glob en un directorio base estático + un patrón relativo apto para el
 * flag --glob de ripgrep (que exige patrones relativos incluso cuando
 * quien llama nos dio un patrón absoluto).
 *
 * Un split incorrecto = ripgrep busca en el directorio equivocado:
 * - "/etc/*.conf" debe buscar en /etc con patrón "*.conf"
 * - "src/**\/*.ts" debe buscar en "src" con patrón "**\/*.ts"
 * - "*.md" sin separador debe buscar en cwd
 *
 * Los casos límite incluyen rutas literales (sin chars de glob), raíces de
 * unidad de Windows (C:/) y patrones de raíz (/).
 */
import { describe, expect, test } from 'bun:test'
import { extractGlobBaseDirectory } from '../glob.js'

describe('extractGlobBaseDirectory — patrones glob básicos', () => {
  test('relative pattern with separator', () => {
    expect(extractGlobBaseDirectory('src/*.ts')).toEqual({
      baseDir: 'src',
      relativePattern: '*.ts',
    })
  })

  test('deep relative pattern', () => {
    expect(extractGlobBaseDirectory('a/b/c/*.ts')).toEqual({
      baseDir: 'a/b/c',
      relativePattern: '*.ts',
    })
  })

  test('pattern with **', () => {
    expect(extractGlobBaseDirectory('src/**/*.ts')).toEqual({
      baseDir: 'src',
      relativePattern: '**/*.ts',
    })
  })

  test('pattern with ? wildcard', () => {
    expect(extractGlobBaseDirectory('src/?.ts')).toEqual({
      baseDir: 'src',
      relativePattern: '?.ts',
    })
  })

  test('pattern with [...] character class', () => {
    expect(extractGlobBaseDirectory('src/[abc].ts')).toEqual({
      baseDir: 'src',
      relativePattern: '[abc].ts',
    })
  })

  test('pattern with {...} alternation', () => {
    expect(extractGlobBaseDirectory('src/{a,b}.ts')).toEqual({
      baseDir: 'src',
      relativePattern: '{a,b}.ts',
    })
  })
})

describe('extractGlobBaseDirectory — sin separador antes del glob', () => {
  test('star at root → empty baseDir, full pattern as relative', () => {
    // Contrato documentado: cuando no hay separador de ruta antes del
    // primer char de glob, el patrón es relativo a cwd → baseDir es ''.
    expect(extractGlobBaseDirectory('*.md')).toEqual({
      baseDir: '',
      relativePattern: '*.md',
    })
  })

  test('?abc pattern at root', () => {
    expect(extractGlobBaseDirectory('?abc.ts')).toEqual({
      baseDir: '',
      relativePattern: '?abc.ts',
    })
  })

  test('** at root', () => {
    expect(extractGlobBaseDirectory('**')).toEqual({
      baseDir: '',
      relativePattern: '**',
    })
  })
})

describe('extractGlobBaseDirectory — rutas literales (sin chars de glob)', () => {
  test('literal file → dirname/basename split', () => {
    expect(extractGlobBaseDirectory('src/file.ts')).toEqual({
      baseDir: 'src',
      relativePattern: 'file.ts',
    })
  })

  test('bare filename → "." dirname + filename', () => {
    // path.dirname('foo.ts') === '.'
    expect(extractGlobBaseDirectory('foo.ts')).toEqual({
      baseDir: '.',
      relativePattern: 'foo.ts',
    })
  })

  test('absolute literal path', () => {
    expect(extractGlobBaseDirectory('/etc/passwd')).toEqual({
      baseDir: '/etc',
      relativePattern: 'passwd',
    })
  })
})

describe('extractGlobBaseDirectory — patrones de raíz', () => {
  test('/*.txt → baseDir is /, pattern is *.txt', () => {
    // Contrato documentado: cuando lastSepIndex es 0, baseDir queda vacío
    // pero usamos '/' como raíz.
    expect(extractGlobBaseDirectory('/*.txt')).toEqual({
      baseDir: '/',
      relativePattern: '*.txt',
    })
  })

  test('/**/*.ts → baseDir is /, pattern is **/*.ts', () => {
    expect(extractGlobBaseDirectory('/**/*.ts')).toEqual({
      baseDir: '/',
      relativePattern: '**/*.ts',
    })
  })

  test('absolute deep glob', () => {
    expect(extractGlobBaseDirectory('/usr/local/*.so')).toEqual({
      baseDir: '/usr/local',
      relativePattern: '*.so',
    })
  })
})

describe('extractGlobBaseDirectory — preserva separadores correctamente', () => {
  test('multiple consecutive slashes preserved (split at last)', () => {
    // path.lastIndexOf('/') usa la ÚLTIMA barra, incluso tras consecutivas.
    expect(extractGlobBaseDirectory('a//b/*.ts')).toEqual({
      baseDir: 'a//b',
      relativePattern: '*.ts',
    })
  })

  test('trailing slash before glob → baseDir without trailing slash', () => {
    // 'src/' + '*.ts' → lastSepIndex = 3, baseDir = 'src'.
    expect(extractGlobBaseDirectory('src/*.ts')).toEqual({
      baseDir: 'src',
      relativePattern: '*.ts',
    })
  })
})

describe('extractGlobBaseDirectory — forma del retorno', () => {
  test('always returns object with both keys', () => {
    const r = extractGlobBaseDirectory('src/*.ts')
    expect('baseDir' in r).toBe(true)
    expect('relativePattern' in r).toBe(true)
  })

  test('both fields are strings', () => {
    const r = extractGlobBaseDirectory('src/*.ts')
    expect(typeof r.baseDir).toBe('string')
    expect(typeof r.relativePattern).toBe('string')
  })

  test('non-empty pattern produces non-empty relative', () => {
    const r = extractGlobBaseDirectory('src/foo.ts')
    expect(r.relativePattern.length).toBeGreaterThan(0)
  })
})

describe('extractGlobBaseDirectory — glob char detectado dentro de un componente', () => {
  test('glob in middle path component', () => {
    // 'src/foo*/bar.ts' — el primer char de glob está en la posición 7
    // (el '*'). staticPrefix = 'src/foo'; lastSep en 3 → baseDir = 'src',
    // relative = 'foo*/bar.ts'.
    expect(extractGlobBaseDirectory('src/foo*/bar.ts')).toEqual({
      baseDir: 'src',
      relativePattern: 'foo*/bar.ts',
    })
  })

  test('glob char in filename only', () => {
    expect(extractGlobBaseDirectory('a/b/c?.txt')).toEqual({
      baseDir: 'a/b',
      relativePattern: 'c?.txt',
    })
  })

  test('curly brace alternation in middle', () => {
    expect(extractGlobBaseDirectory('a/{x,y}/file.ts')).toEqual({
      baseDir: 'a',
      relativePattern: '{x,y}/file.ts',
    })
  })
})

describe('extractGlobBaseDirectory — entradas degeneradas', () => {
  test('empty string → no glob, empty input → bare dirname/basename', () => {
    // path.dirname('') === '.', path.basename('') === ''
    expect(extractGlobBaseDirectory('')).toEqual({
      baseDir: '.',
      relativePattern: '',
    })
  })

  test('single dot', () => {
    expect(extractGlobBaseDirectory('.')).toEqual({
      baseDir: '.',
      relativePattern: '.',
    })
  })

  test('trailing slash literal: path.dirname strips trailing slash', () => {
    // 'a/b/' no tiene glob; path.dirname de node recorta la barra final y
    // retorna 'a' (no 'a/b'); path.basename retorna 'b'. Fija el
    // comportamiento del módulo path.
    expect(extractGlobBaseDirectory('a/b/')).toEqual({
      baseDir: 'a',
      relativePattern: 'b',
    })
  })
})
