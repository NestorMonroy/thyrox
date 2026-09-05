/**
 * El claim ledger de coordinación (T-101, board #63).
 *
 * Fuente de la decisión: el DEC del bloque 24 de ``tareas-construir-harness-propio``
 * (:ref:`analisis-cowork-en-nuestro-harness`, :ref:`h-docs-1025`, :ref:`h-docs-1026`).
 *
 * El control de ``fileOverlapGate`` es un POSITIVO REAL del repo, no fabricado
 * (sub-patrón D de ``metrica-decide-la-conclusion.md``): entre
 * ``origin/feature/kaupamex-l0`` y ``origin/feature/kaupamex-l2`` la única ruta que
 * ambas ramas tocaron es ``.claude/agent-results/agent_store.sqlite3``; el par
 * l2↔l3 no solapa. Si esas refs cambian, el test lo delata. El ledger se prueba
 * con reservas declaradas —solapadas por prefijo y disjuntas— sobre un ledger
 * temporal, sin tocar el ledger real.
 */

import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  activeClaims, appendClaim, combineGates, DEFAULT_LEDGER_REL, driverAwareFileOverlapGate,
  fileOverlapGate, findOverlaps, gitTopLevel, ledgerPathFor, newClaimId, pathsOverlap,
  readLedger, whoHas, type ClaimRecord,
} from '../src/cowork/claims.ts'
import type { CollisionCheck, IntegrationRepo } from '../src/branchIntegration.ts'

const DOCS_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const L2 = 'origin/feature/kaupamex-l2'
const L0 = 'origin/feature/kaupamex-l0'
const L3 = 'origin/feature/kaupamex-l3'

function hasRef(ref: string): boolean {
  try {
    execFileSync('git', ['-C', DOCS_ROOT, 'rev-parse', '--verify', '--quiet', ref], { encoding: 'utf8' })
    return true
  } catch {
    return false
  }
}

function rec(over: Partial<ClaimRecord> & Pick<ClaimRecord, 'op' | 'path' | 'owner'>): ClaimRecord {
  return { id: newClaimId(), branch: 'b', at: '2026-01-01T00:00:00Z', ...over }
}

function tmpLedger(): string {
  return join(mkdtempSync(join(tmpdir(), 'ledger-')), 'claims.jsonl')
}

// --- pathsOverlap: la contención de prefijo con límite en `/` -----------------

describe('pathsOverlap', () => {
  test('rutas iguales solapan', () => expect(pathsOverlap('src/foo', 'src/foo')).toBe(true))
  test('ancestro contiene descendiente', () => expect(pathsOverlap('src', 'src/foo/bar')).toBe(true))
  test('y en la otra dirección', () => expect(pathsOverlap('src/foo/bar', 'src')).toBe(true))
  test('mismo prefijo de cadena NO es contención', () =>
    expect(pathsOverlap('src/foo', 'src/foobar')).toBe(false))
  test('rutas disjuntas no solapan', () => expect(pathsOverlap('a/b', 'c/d')).toBe(false))
  test('la barra final no cuenta', () => expect(pathsOverlap('src/', 'src')).toBe(true))
})

// --- ledger: round-trip, active fold, ids únicos ------------------------------

describe('ledger — escritura y lectura', () => {
  test('append + read hace round-trip; el archivo ausente es vacío', () => {
    const L = tmpLedger()
    expect(readLedger(L)).toEqual([])
    const c = rec({ op: 'claim', path: 'x/y', owner: 'l2' })
    appendClaim(L, c)
    expect(readLedger(L)).toEqual([c])
  })

  test('una claim y su release del mismo (owner,path) deja la reserva inactiva', () => {
    const L = tmpLedger()
    appendClaim(L, rec({ op: 'claim', path: 'x/y', owner: 'l2' }))
    appendClaim(L, rec({ op: 'release', path: 'x/y', owner: 'l2' }))
    expect(activeClaims(readLedger(L))).toEqual([])
  })

  test('el release de OTRO dueño no retira la reserva', () => {
    const L = tmpLedger()
    appendClaim(L, rec({ op: 'claim', path: 'x/y', owner: 'l2' }))
    appendClaim(L, rec({ op: 'release', path: 'x/y', owner: 'l3' }))
    expect(activeClaims(readLedger(L)).map((c) => c.owner)).toEqual(['l2'])
  })

  test('newClaimId da ids distintos (no un ordinal que colisione — la lección de H-DOCS-1026)', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newClaimId()))
    expect(ids.size).toBe(1000)
  })

  test('una línea JSONL malformada lanza con su número, no se ignora', () => {
    const L = tmpLedger()
    appendClaim(L, rec({ op: 'claim', path: 'x', owner: 'l2' }))
    execFileSync('bash', ['-c', `printf 'no-es-json\\n' >> ${JSON.stringify(L)}`])
    expect(() => readLedger(L)).toThrow(/línea JSONL malformada/)
  })
})

// --- whoHas / findOverlaps: el conflicto entre dueños distintos ---------------

describe('whoHas / findOverlaps', () => {
  test('whoHas ve la reserva que contiene la ruta consultada', () => {
    const recs = [rec({ op: 'claim', path: '.claude/packages', owner: 'l2' })]
    expect(whoHas(recs, '.claude/packages/harness/src/x.ts').map((c) => c.owner)).toEqual(['l2'])
  })

  test('dos dueños distintos sobre rutas anidadas → 1 solape', () => {
    const recs = [
      rec({ op: 'claim', path: 'src', owner: 'l2' }),
      rec({ op: 'claim', path: 'src/foo', owner: 'l3' }),
    ]
    expect(findOverlaps(recs)).toHaveLength(1)
  })

  test('el mismo dueño sobre rutas anidadas NO es solape', () => {
    const recs = [
      rec({ op: 'claim', path: 'src', owner: 'l2' }),
      rec({ op: 'claim', path: 'src/foo', owner: 'l2' }),
    ]
    expect(findOverlaps(recs)).toHaveLength(0)
  })

  test('dueños distintos sobre rutas disjuntas NO solapan', () => {
    const recs = [
      rec({ op: 'claim', path: 'a', owner: 'l2' }),
      rec({ op: 'claim', path: 'b', owner: 'l3' }),
    ]
    expect(findOverlaps(recs)).toHaveLength(0)
  })

  test('una reserva liberada ya no cuenta en el solape', () => {
    const recs = [
      rec({ op: 'claim', path: 'src', owner: 'l2' }),
      rec({ op: 'claim', path: 'src/foo', owner: 'l3' }),
      rec({ op: 'release', path: 'src/foo', owner: 'l3' }),
    ]
    expect(findOverlaps(recs)).toHaveLength(0)
  })
})

// --- fileOverlapGate: control con POSITIVO REAL del repo -----------------------

describe('fileOverlapGate — control con positivo real', () => {
  test.if(hasRef(L0) && hasRef(L2))('POSITIVO: l0 vs l2 ve el store como ruta solapada', () => {
    const r = fileOverlapGate({ path: DOCS_ROOT, source: L0, target: L2 })
    expect(r.ran).toBe(true)
    expect(r.collisions).toBeGreaterThanOrEqual(1)
    expect(r.detail).toContain('agent_store.sqlite3')
   }, { timeout: 60000 })

  test.if(hasRef(L2) && hasRef(L3))('NEGATIVO: l2 vs l3 no solapa', () => {
    const r = fileOverlapGate({ path: DOCS_ROOT, source: L2, target: L3 })
    expect(r.ran).toBe(true)
    expect(r.collisions).toBe(0)
   }, { timeout: 60000 })

  test('sin merge-base declara ran:false, no un 0 verde', () => {
    const r = fileOverlapGate({ path: DOCS_ROOT, source: 'no/existe/ref', target: L2 })
    expect(r.ran).toBe(false)
    expect(r.collisions).toBe(0)
  })
})

// --- combineGates: un gate que mide basta para bloquear -----------------------

describe('combineGates', () => {
  const measuring = (n: number) => (): CollisionCheck => ({ ran: true, collisions: n, detail: `mide ${n}` })
  const notApplicable = (): CollisionCheck => ({ ran: false, collisions: 0, detail: 'no aplica' })
  const repo: IntegrationRepo = { path: DOCS_ROOT, source: L0, target: L2 }

  test('mide (2) + no-aplica → ran:true, collisions:2', () => {
    const r = combineGates(measuring(2), notApplicable)(repo)
    expect(r.ran).toBe(true)
    expect(r.collisions).toBe(2)
  })

  test('dos que miden suman', () => {
    expect(combineGates(measuring(1), measuring(2))(repo).collisions).toBe(3)
  })

  test('dos no-aplica → ran:false (no finge un 0 verde)', () => {
    expect(combineGates(notApplicable, notApplicable)(repo).ran).toBe(false)
  })
})

// --- driverAwareFileOverlapGate: control sintético (sub-patrón D) -------------
// No depende del config del clon ambiente: construye su repo, controla el
// .gitattributes y el driver. Discrimina de verdad — instalar el driver del
// store baja las colisiones 2→1 (store resuelto, un binario sin atributo sigue).

function nul(text: string): string {
  return `head\n\x00${text}\n`
}

function synthOverlapRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'overlap-'))
  const g = (...a: string[]) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' })
  g('init', '-q', '-b', 'target')
  g('config', 'user.email', 't@t')
  g('config', 'user.name', 't')
  // store.bin: binario, con driver NOMBRADO (no definido aún); notes.txt: texto;
  // blob.dat: binario SIN atributo (binario por contenido);
  // pooled.txt: texto con driver INCORPORADO ``merge=union`` — git lo fusiona sin
  // config, así que NO debe contarse como driverGap aunque ``merge.union.driver``
  // no exista en config (control que discrimina el manejo de builtins).
  writeFileSync(join(dir, '.gitattributes'), 'store.bin merge=xunion\npooled.txt merge=union\n')
  writeFileSync(join(dir, 'store.bin'), nul('base'))
  writeFileSync(join(dir, 'notes.txt'), 'linea base\n')
  writeFileSync(join(dir, 'blob.dat'), nul('base'))
  writeFileSync(join(dir, 'pooled.txt'), 'linea base\n')
  g('add', '-A')
  g('commit', '-q', '-m', 'seed')
  g('checkout', '-q', '-b', 'source')
  writeFileSync(join(dir, 'store.bin'), nul('SOURCE'))
  writeFileSync(join(dir, 'notes.txt'), 'linea source\n')
  writeFileSync(join(dir, 'blob.dat'), nul('SOURCE'))
  writeFileSync(join(dir, 'pooled.txt'), 'linea source\n')
  g('commit', '-qam', 'source edits')
  g('checkout', '-q', 'target')
  writeFileSync(join(dir, 'store.bin'), nul('TARGET'))
  writeFileSync(join(dir, 'notes.txt'), 'linea target\n')
  writeFileSync(join(dir, 'blob.dat'), nul('TARGET'))
  writeFileSync(join(dir, 'pooled.txt'), 'linea target\n')
  g('commit', '-qam', 'target edits')
  return dir
}

describe('driverAwareFileOverlapGate — control sintético', () => {
  test('sin el driver: store.bin y blob.dat cuentan (2); notes.txt y pooled.txt no', () => {
    const dir = synthOverlapRepo()
    const r = driverAwareFileOverlapGate({ path: dir, source: 'source', target: 'target' })
    expect(r.ran).toBe(true)
    expect(r.collisions).toBe(2)
    expect(r.detail).toContain('store.bin')
    expect(r.detail).toContain('blob.dat')
    // notes.txt es texto: git lo fusiona 3-way, no bloquea.
    expect(r.detail).toContain('notes.txt')
    expect(r.detail).toContain('texto 3-way')
    // pooled.txt lleva ``merge=union`` (builtin): git lo fusiona sin config, así
    // que NO cuenta como driverGap aunque ``merge.union.driver`` no exista. Sin el
    // manejo de builtins caería a «declarado pero NO configurado» y sumaría 3.
    expect(r.detail).toContain('pooled.txt')
    expect(r.detail).toContain('union (incorporado)')
  })

  test('instalar el driver del store baja 2→1: store resuelto, blob sigue', () => {
    const dir = synthOverlapRepo()
    execFileSync('git', ['-C', dir, 'config', 'merge.xunion.driver', 'true'])
    const r = driverAwareFileOverlapGate({ path: dir, source: 'source', target: 'target' })
    expect(r.ran).toBe(true)
    expect(r.collisions).toBe(1) // sólo blob.dat (binario por contenido, sin driver)
    expect(r.detail).toContain('driver «xunion» instalado')
  })

  test('sin merge-base declara ran:false, no un 0 verde', () => {
    const r = driverAwareFileOverlapGate({ path: DOCS_ROOT, source: 'no/existe/ref', target: L2 })
    expect(r.ran).toBe(false)
    expect(r.collisions).toBe(0)
  })
})


/**
 * El hogar del ledger — el control que faltaba (:ref:`h-docs-1077`).
 *
 * El defecto que estos casos cierran no era de conteo sino de ANCLA: la ruta
 * salía de ``join(cwd, …)``, así que desde un subdirectorio se escribía un
 * ledger distinto y el overlap gate informaba cero solapes donde había uno.
 * El control discrimina porque una raíz y un subdirectorio suyo tienen que dar
 * EL MISMO archivo; con el cuerpo anterior daban dos.
 */
describe('ledgerPathFor — el ledger vive en la raíz del repositorio', () => {
  test('raíz y subdirectorio resuelven al MISMO archivo', () => {
    const sub = join(DOCS_ROOT, '.claude', 'packages', 'harness')
    expect(ledgerPathFor(sub)).toBe(ledgerPathFor(DOCS_ROOT))
    expect(ledgerPathFor(sub)).toBe(join(DOCS_ROOT, DEFAULT_LEDGER_REL))
  })

  test('fuera de un repositorio REHÚSA nombrando el directorio, y no escribe nada', () => {
    const fuera = mkdtempSync(join(tmpdir(), 'sin-repo-'))
    expect(() => ledgerPathFor(fuera)).toThrow(fuera)
    expect(existsSync(join(fuera, '.claude'))).toBe(false)
  })

  test('gitTopLevel devuelve null fuera de un repositorio, no lanza', () => {
    expect(gitTopLevel(mkdtempSync(join(tmpdir(), 'sin-repo-')))).toBe(null)
  })

  test('la ruta explícita es la salida de emergencia y no se comprueba', () => {
    const fuera = join(mkdtempSync(join(tmpdir(), 'sin-repo-')), 'propio.jsonl')
    expect(ledgerPathFor(process.cwd(), fuera)).toBe(fuera)
  })
})
