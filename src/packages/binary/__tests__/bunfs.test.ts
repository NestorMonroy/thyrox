/**
 * Tests del contenedor de Bun — fidelidad contra el ejecutable de esta maquina
 * y contra el corpus versionado en `_references/claude-code-bin/<build>/`.
 *
 * La fuente NO es una descripcion: es el formato que el propio ejecutable
 * declara. Cada asercion se ancla a una de estas tres cosas, y el comentario
 * dice a cual:
 *
 *   - ELF64 gABI  — encabezado de seccion en `e_shoff`, entradas de
 *                   `e_shentsize` bytes, nombres via `e_shstrndx`.
 *   - Bun         — el trailer `\n---- Bun! ----\n` al final del payload, con
 *                   (offset, largo) de la tabla como u32 en `fin - 24`.
 *   - la build    — cifras medidas de UN ejecutable concreto. Una build es
 *                   inmutable, asi que fijarlas es evidencia fechada, no una
 *                   cifra viva.
 *
 * Control positivo del porte: `extraer_modulos_del_binario.py` (probe Python de
 * `.claude/eventos/extraer-binario-20260823T005658/`), que ya extrajo 2.1.246
 * con SHA-256 por archivo. El porte nativo debe coincidir byte a byte.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync } from 'node:fs'
import { findSection, isElf } from '../src/elf.ts'
import { BUNFS_PREFIX, BUN_MAGIC, SECTION_HEADER, deriveVersion, readModuleTable, readTrailer } from '../src/bunfs.ts'

const BINARY = '/opt/claude-code/bin/claude'

/**
 * Cifras medidas por build. Una entrada se anade SOLO tras medirla; nunca se
 * copia de la anterior. Fuente de 2.1.258: dry-run del probe Python el
 * 2026-09-02.
 */
const MEASURED: Record<string, { entries: number; tableBytes: number; extractedBytes: number }> = {
  '2.1.258': { entries: 1802, tableBytes: 93_704, extractedBytes: 38_463_684 },
}

const bytes = existsSync(BINARY) ? readFileSync(BINARY) : null

describe('constantes del contenedor', () => {
  test('BUN_MAGIC fija el trailer que Bun escribe', () => {
    // El literal, verbatim: `\n---- Bun! ----\n`. Si Bun lo cambia, esto cae.
    expect(BUN_MAGIC).toEqual(Buffer.from('\n---- Bun! ----\n'))
  })

  test('BUNFS_PREFIX fija la raiz virtual que el payload declara', () => {
    // Aparece en cada `import` del bundle: `from"/$bunfs/root/chunk-….js"`.
    expect(BUNFS_PREFIX).toBe('/$bunfs/root/')
  })

  test('SECTION_HEADER = 8 — la seccion antepone cabecera al payload', () => {
    // Los punteros del trailer son relativos al PAYLOAD, no a la seccion; sin
    // este desplazamiento la tabla se lee ocho bytes corrida y da basura.
    expect(SECTION_HEADER).toBe(8)
  })
})

describe('lectura del ELF (gABI)', () => {
  test('isElf reconoce el magic y rechaza cualquier otra cosa', () => {
    expect(isElf(Buffer.from('\x7fELF' + 'x'.repeat(60)))).toBe(true)
    expect(isElf(Buffer.from('MZ' + 'x'.repeat(60)))).toBe(false)
  })

  test.if(bytes !== null)('el ejecutable declara una seccion .bun', () => {
    // gABI: la tabla de secciones vive en e_shoff (0x28), sus entradas miden
    // e_shentsize (0x3A) y sus nombres salen de la seccion e_shstrndx.
    const s = findSection(bytes!, '.bun')
    expect(s).not.toBeNull()
    expect(s!.size).toBeGreaterThan(1_000_000)
  })

  test.if(bytes !== null)('una seccion inexistente devuelve null, no una lectura al azar', () => {
    expect(findSection(bytes!, '.no-existe')).toBeNull()
  })
})

describe('trailer y tabla de modulos', () => {
  test.if(bytes !== null)('readTrailer localiza la tabla desde el final del payload', () => {
    const s = findSection(bytes!, '.bun')!
    const payload = bytes!.subarray(s.offset + SECTION_HEADER, s.offset + s.size)
    const t = readTrailer(payload)
    expect(t).not.toBeNull()
    expect(t!.tableOffset).toBeGreaterThan(0)
    expect(t!.tableLength).toBeGreaterThan(0)
  })

  test('readTrailer devuelve null si no hay magic — no adivina', () => {
    // Sub-patron D: el fallo tiene que ser distinguible del exito. Un payload
    // sin trailer no puede producir una tabla «vacia» que se lea como valida.
    expect(readTrailer(Buffer.alloc(4096))).toBeNull()
  })

  test.if(bytes !== null)('la forma de la tabla se DERIVA probando candidatos', () => {
    // El paso entre entradas no esta declarado en ninguna parte: se prueba
    // (arranque, paso) y se acepta el que produce nombres imprimibles en TODAS
    // las entradas. Un candidato equivocado produce basura, no rutas.
    const s = findSection(bytes!, '.bun')!
    const payload = bytes!.subarray(s.offset + SECTION_HEADER, s.offset + s.size)
    const tabla = readModuleTable(payload)
    expect(tabla).not.toBeNull()
    expect(tabla!.stride).toBeGreaterThan(0)
    expect(tabla!.entries.length).toBeGreaterThan(3)
    for (const e of tabla!.entries) expect(e.name.startsWith(BUNFS_PREFIX)).toBe(true)
  })
})

describe('fidelidad contra la build medida', () => {
  test.if(bytes !== null)('el payload declara su propia version', () => {
    // `// Version: N.N.N` dentro del bundle. Se DERIVA de ahi y no del nombre
    // del directorio ni de `claude --version`: en H-DOCS-455 el contenedor
    // actualizo el ejecutable a media sesion y las dos mintieron.
    const s = findSection(bytes!, '.bun')!
    expect(deriveVersion(bytes!.subarray(s.offset, s.offset + s.size))).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test.if(bytes !== null)('las cifras de la build viva coinciden con las medidas', () => {
    const s = findSection(bytes!, '.bun')!
    const payload = bytes!.subarray(s.offset + SECTION_HEADER, s.offset + s.size)
    const version = deriveVersion(bytes!.subarray(s.offset, s.offset + s.size))!
    const esperado = MEASURED[version]

    // Una build desconocida FALLA, no se salta. El salto seria un verde que no
    // discrimina «coincide» de «no lo mire» — y es justo la senal de frescura
    // que falto tres builds seguidas (2.1.250, 2.1.251, 2.1.258).
    expect(
      esperado ?? `build ${version} sin medir — anadir su fila a MEASURED tras extraerla`,
    ).toBeObject()

    const tabla = readModuleTable(payload)!
    expect(tabla.entries.length).toBe(esperado!.entries)
    expect(tabla.tableLength).toBe(esperado!.tableBytes)
    expect(tabla.entries.reduce((n, e) => n + e.length, 0)).toBe(esperado!.extractedBytes)
  })
})
