/**
 * Integración de rama a rama, abstracta (T-098).
 *
 * Fuente del procedimiento: :ref:`analisis-procedimiento-de-integracion-entre-ramas`
 * y el hueco de ``git-flow.md`` R-04 (:ref:`h-docs-1023`).
 *
 * El control del gate de colisión es un POSITIVO REAL del repo, no fabricado
 * (sub-patrón D de ``metrica-decide-la-conclusion.md``): ``h-docs-94`` choca
 * entre ``origin/feature/kaupamex-l2`` y ``origin/feature/kaupamex-l0`` (dos rutas,
 * el rename ``el-pipeline`` vs ``la-tuberia``). El NEGATIVO usaba el par l2↔l3,
 * que DEJÓ de ser limpio: ambas ramas acuñaron ``h-docs-1025`` de forma
 * independiente (:ref:`h-docs-1027`) — justo el fenómeno que la iniciativa de
 * cowork estudia. El control atrapó esa deriva viva (que es lo que un control
 * debe hacer), así que el NEGATIVO pasa a un self-pair (l2 vs l2), limpio por
 * construcción y no dependiente de que ninguna rama viva se mantenga sin
 * colisiones.
 *
 * El merge de ``integrate`` se prueba sobre un repo git sintético creado en el
 * test, con sus tres desenlaces que discriminan: merged, dirty-tree, wrong-committer.
 */

import { thyroxRoot } from '../../../paths/reach.ts'
import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  integrate, verificationPlan, docsLabelCollisionGate, committerMismatch, docsLabelRenumber,
  unionConflictResolver,
  EXPECTED_COMMITTER_EMAIL, EXPECTED_COMMITTER_NAME,
  type CollisionGate, type IntegrationRepo, type LabelResolver, type RenumberedLabel, type StaticGate,
} from '../src/branchIntegration.ts'

const DOCS_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const L2 = 'origin/feature/kaupamex-l2'
const L0 = 'origin/feature/kaupamex-l0'
const L3 = 'origin/feature/kaupamex-l3'

/**
 * ¿La ref existe en ESTE clon? Alimenta a `test.if`, así que su respuesta útil
 * es el `false`: sin él, un contenedor sin la rama no salta el caso — revienta.
 *
 * `rev-parse --verify` sale 1 cuando la ref no está, y `execFileSync` convierte
 * ese 1 en excepción. Por eso el try/catch envuelve la ÚNICA llamada: la
 * versión anterior lo tenía tras un `||` que nunca se alcanzaba.
 */
function hasRef(ref: string): boolean {
  try {
    execFileSync('git', ['-C', DOCS_ROOT, 'rev-parse', '--verify', ref], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

describe('docsLabelCollisionGate — control con positivo real', () => {
  test.if(hasRef(L2) && hasRef(L0))('POSITIVO: l2 vs l0 ve la colisión h-docs-94', () => {
    const r = docsLabelCollisionGate({ path: DOCS_ROOT, source: L0, target: L2 })
    expect(r.ran).toBe(true)
    expect(r.collisions).toBeGreaterThanOrEqual(1)
   }, { timeout: 60000 })

  // Antes: l2↔l3 (asumía par limpio). Ahora l2↔l3 choca en h-docs-1025
  // (:ref:`h-docs-1027`), así que el NEGATIVO usa un self-pair, limpio por
  // construcción: una ref contra sí misma no puede tener etiquetas duplicadas
  // cross-archivo. El POSITIVO de arriba sigue discriminando con un choque real.
  test.if(hasRef(L2))('NEGATIVO: un par limpio (l2 vs l2) da 0', () => {
    const r = docsLabelCollisionGate({ path: DOCS_ROOT, source: L2, target: L2 })
    expect(r.ran).toBe(true)
    expect(r.collisions).toBe(0)
   }, { timeout: 60000 })
})

// --- integrate: repo git sintético, tres desenlaces que discriminan ---------

function synthRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'integ-'))
  const g = (...a: string[]) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' })
  g('init', '-q', '-b', 'target')
  g('config', 'user.name', EXPECTED_COMMITTER_NAME)
  g('config', 'user.email', EXPECTED_COMMITTER_EMAIL)
  writeFileSync(join(dir, 'base.txt'), 'base\n')
  g('add', 'base.txt'); g('commit', '-q', '-m', 'seed')
  // rama origen con un commit propio que el destino no tiene
  g('checkout', '-q', '-b', 'source')
  writeFileSync(join(dir, 'del-origen.txt'), 'origen\n')
  g('add', 'del-origen.txt'); g('commit', '-q', '-m', 'trabajo del origen')
  g('checkout', '-q', 'target')
  return dir
}

const noCollision: CollisionGate = () => ({ ran: false, collisions: 0, detail: 'sin eje de etiquetas' })

describe('integrate — repo sintético', () => {
  test('merged: source no ancestro → merge --no-ff con committer jcg-admin', () => {
    const dir = synthRepo()
    const repo: IntegrationRepo = { path: dir, source: 'source', target: 'target' }
    const [res] = integrate([repo], { collisionGate: noCollision })
    expect(res.precondition).toBe('ok')
    expect(res.merge).toBe('merged')
    expect(res.mergeSha).toBeTruthy()
    // el commit de merge existe y su committer es jcg-admin
    const committer = execFileSync('git', ['-C', dir, 'log', '-1', '--format=%cn <%ce>'], { encoding: 'utf8' }).trim()
    expect(committer).toBe(`${EXPECTED_COMMITTER_NAME} <${EXPECTED_COMMITTER_EMAIL}>`)
    const parents = execFileSync('git', ['-C', dir, 'rev-list', '--parents', '-n', '1', 'HEAD'], { encoding: 'utf8' }).trim().split(' ')
    expect(parents.length).toBe(3) // merge commit: dos padres
  })

  test('up-to-date: source ya ancestro → no-op', () => {
    const dir = synthRepo()
    // fusiona una vez; segunda vez debe ser up-to-date
    integrate([{ path: dir, source: 'source', target: 'target' }], { collisionGate: noCollision })
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { collisionGate: noCollision })
    expect(res.merge).toBe('up-to-date')
  })

  test('dirty-tree: árbol sucio → no se integra', () => {
    const dir = synthRepo()
    writeFileSync(join(dir, 'sucio.txt'), 'x\n')
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { collisionGate: noCollision })
    expect(res.precondition).toBe('dirty-tree')
    expect(res.merge).toBe('skipped')
  })

  test('wrong-committer: committer ≠ jcg-admin → no se integra', () => {
    const dir = synthRepo()
    execFileSync('git', ['-C', dir, 'config', 'user.email', 'noreply@anthropic.com'])
    execFileSync('git', ['-C', dir, 'config', 'user.name', 'Claude'])
    expect(committerMismatch(dir)).not.toBeNull()
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { collisionGate: noCollision })
    expect(res.precondition).toBe('wrong-committer')
    expect(res.merge).toBe('skipped')
  })

  test('gate bloqueante medido detiene el merge ANTES de fusionar', () => {
    const dir = synthRepo()
    const gateColisiona: CollisionGate = () => ({ ran: true, collisions: 2, detail: 'dos etiquetas' })
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { collisionGate: gateColisiona })
    expect(res.merge).toBe('skipped')
    expect(res.message).toContain('bloqueado')
    // el árbol quedó intacto: HEAD sigue en el commit seed (sin merge)
    const log = execFileSync('git', ['-C', dir, 'log', '--oneline'], { encoding: 'utf8' }).trim().split('\n')
    expect(log.length).toBe(1)
  })
})

describe('verificationPlan — lista, nunca ejecución', () => {
  test('devuelve gates por tipo sin correr nada', () => {
    const plan = verificationPlan([
      { path: '/x/api', kind: 'python-api' },
      { path: '/x/ui', kind: 'js-ui' },
      { path: '/x/docs', kind: 'docs' },
    ])
    expect(plan).toHaveLength(3)
    expect(plan[0].gates.some((g) => g.includes('pytest'))).toBe(true)
    expect(plan[1].gates.some((g) => g.includes('jest'))).toBe(true)
    expect(plan[2].gates.some((g) => g.includes('make html'))).toBe(true)
    for (const step of plan) expect(step.note).toContain('el disparo es del ejecutor')
  })
})

// --- integrate: colisión de etiqueta se AUTO-RENUMERA, no aborta (#71) --------
//
// El control feliz ejerce el resolutor REAL (renumerar_colision.py) end-to-end:
// se copian los dos guiones al repo sintético y se siembra un universo remoto
// para que ``id_libre`` tenga con qué calcular. El TAMPER prueba que el control
// post-merge PUEDE FALLAR (sub-patrón D): un resolutor que MIENTE —dice haber
// renumerado sin tocar el árbol— deja la etiqueta duplicada, y el control lo
// detecta y aborta en vez de sellar un árbol roto.

// El gate se mudo a thyrox/src/gates/; vivia en docs/.claude/scripts/gates/.
const GATES_DIR = join(thyroxRoot(), 'src', 'gates')

function rst(label: string, heading: string): string {
  const under = '='.repeat(Math.max(heading.length, 12))
  return `.. _${label}:\n\n${heading}\n${under}\n\ncuerpo.\n`
}

function synthCollisionRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'integ-col-'))
  const g = (...a: string[]) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' })
  g('init', '-q', '-b', 'target')
  g('config', 'user.name', EXPECTED_COMMITTER_NAME)
  g('config', 'user.email', EXPECTED_COMMITTER_EMAIL)
  // los guiones que el resolutor por defecto invoca por ruta RELATIVA
  mkdirSync(join(dir, '.claude', 'scripts', 'gates'), { recursive: true })
  for (const f of ['renumerar_colision.py', 'check_ids_entre_ramas.py']) {
    copyFileSync(join(GATES_DIR, f), join(dir, '.claude', 'scripts', 'gates', f))
  }
  writeFileSync(join(dir, 'base.txt'), 'base\n')
  g('add', '-A'); g('commit', '-q', '-m', 'seed')
  const seedTip = g('rev-parse', 'HEAD').trim()
  // destino: declara h-docs-500 en su propia ruta
  mkdirSync(join(dir, 'source', 'tinit'), { recursive: true })
  writeFileSync(join(dir, 'source', 'tinit', 'hallazgo-H-DOCS-500-t.rst'), rst('h-docs-500', 'H-DOCS-500 destino'))
  g('add', '-A'); g('commit', '-q', '-m', 'target declara 500')
  // universo remoto para id_libre: una ref con la 500 → siguiente libre = 501
  g('update-ref', 'refs/remotes/origin/seed', g('rev-parse', 'HEAD').trim())
  // origen: parte de seed, declara la MISMA etiqueta en OTRA ruta + un index que la cita
  g('checkout', '-q', '-b', 'source', seedTip)
  mkdirSync(join(dir, 'source', 'sinit'), { recursive: true })
  writeFileSync(join(dir, 'source', 'sinit', 'hallazgo-H-DOCS-500-s.rst'), rst('h-docs-500', 'H-DOCS-500 origen'))
  writeFileSync(join(dir, 'source', 'sinit', 'index.rst'),
    'Indice\n======\n\n:ref:`h-docs-500`\n\n.. toctree::\n\n   hallazgo-H-DOCS-500-s\n')
  g('add', '-A'); g('commit', '-q', '-m', 'source declara 500')
  g('checkout', '-q', 'target')
  return dir
}

function countLabel(dir: string, label: string): number {
  const out = execFileSync('git', ['-C', dir, 'grep', '-lF', label, '--', 'source/'], { encoding: 'utf8' })
  return out.trim().split('\n').filter(Boolean).length
}

describe('integrate — colisión de etiqueta auto-renumerada', () => {
  test('la colisión NO aborta: se renumera el lado source y se sella el merge', () => {
    const dir = synthCollisionRepo()
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }]) // resolutor por defecto
    expect(res.merge).toBe('merged')
    expect(res.renumbered).toHaveLength(1)
    expect(res.renumbered[0].label).toBe('.. _h-docs-500:')
    expect(res.renumbered[0].newLabel).toBe('.. _h-docs-501:')
    // árbol fusionado: la vieja en 1 archivo (destino), la nueva en 1 (origen)
    expect(countLabel(dir, '.. _h-docs-500:')).toBe(1)
    expect(countLabel(dir, '.. _h-docs-501:')).toBe(1)
    // el archivo declarante del origen se renombró; su index actualizó la ref
    const files = execFileSync('git', ['-C', dir, 'ls-files', 'source/'], { encoding: 'utf8' })
    expect(files).toContain('hallazgo-H-DOCS-501-s.rst')
    expect(files).not.toContain('hallazgo-H-DOCS-500-s.rst')
    const idx = execFileSync('git', ['-C', dir, 'show', 'HEAD:source/sinit/index.rst'], { encoding: 'utf8' })
    expect(idx).toContain(':ref:`h-docs-501`')
    expect(idx).toContain('hallazgo-H-DOCS-501-s')
    // merge commit con dos padres
    const parents = execFileSync('git', ['-C', dir, 'rev-list', '--parents', '-n', '1', 'HEAD'], { encoding: 'utf8' }).trim().split(' ')
    expect(parents.length).toBe(3)
  }, { timeout: 60000 })

  test('TAMPER: un resolutor que MIENTE (no edita) → el control aborta, no sella', () => {
    const dir = synthCollisionRepo()
    // dice haber renumerado pero deja el árbol intacto: la etiqueta sigue duplicada
    const mentiroso: LabelResolver = (): RenumberedLabel[] => [
      { label: '.. _h-docs-500:', newLabel: '.. _h-docs-999:', renamed: null, refsEdited: [] },
    ]
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { labelResolver: mentiroso })
    expect(res.merge).toBe('label-unresolved')
    expect(res.message).toContain('renumerado incompleto')
    // el árbol quedó intacto: HEAD sigue en el tip del destino (sin merge sellado)
    const parents = execFileSync('git', ['-C', dir, 'rev-list', '--parents', '-n', '1', 'HEAD'], { encoding: 'utf8' }).trim().split(' ')
    expect(parents.length).toBe(2) // commit normal, no merge
    expect(execFileSync('git', ['-C', dir, 'status', '--porcelain'], { encoding: 'utf8' }).trim()).toBe('')
  }, { timeout: 60000 })
})

// --- integrate: conflicto de CÓDIGO resuelto por unión determinista (#72) ------
//
// Un conflicto real contenido/contenido: base tiene COMUN, el destino lo cambia a
// DESTINO y el origen a ORIGEN en la MISMA línea. git marca conflicto. La unión
// (determinista, sin pérdida) conserva AMBAS versiones. Tres controles:
//   1. con resolutor → resolved-unverified, sin marcadores, ambos lados presentes;
//   2. sin resolutor → aborta (conducta segura por defecto);
//   3. gate estático en línea que RECHAZA → aborta (el control PUEDE FALLAR).

function synthConflictRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'integ-conf-'))
  const g = (...a: string[]) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' })
  g('init', '-q', '-b', 'target')
  g('config', 'user.name', EXPECTED_COMMITTER_NAME)
  g('config', 'user.email', EXPECTED_COMMITTER_EMAIL)
  writeFileSync(join(dir, 'file.txt'), 'linea1\nCOMUN\nlinea3\n')
  g('add', '-A'); g('commit', '-q', '-m', 'seed')
  const seedTip = g('rev-parse', 'HEAD').trim()
  // destino cambia la línea 2
  writeFileSync(join(dir, 'file.txt'), 'linea1\nDESTINO\nlinea3\n')
  g('add', '-A'); g('commit', '-q', '-m', 'target edita')
  // origen parte de seed y cambia la MISMA línea → conflicto
  g('checkout', '-q', '-b', 'source', seedTip)
  writeFileSync(join(dir, 'file.txt'), 'linea1\nORIGEN\nlinea3\n')
  g('add', '-A'); g('commit', '-q', '-m', 'source edita')
  g('checkout', '-q', 'target')
  return dir
}

describe('integrate — conflicto de código resuelto por unión', () => {
  test('con resolutor: unión sin pérdida → resolved-unverified, sin marcadores', () => {
    const dir = synthConflictRepo()
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { conflictResolver: unionConflictResolver })
    expect(res.merge).toBe('resolved-unverified')
    expect(res.conflictResolution?.strategy).toBe('union')
    expect(res.conflictResolution?.files).toContain('file.txt')
    const content = execFileSync('git', ['-C', dir, 'show', 'HEAD:file.txt'], { encoding: 'utf8' })
    expect(content).not.toContain('<<<<<<<')   // sin marcadores de conflicto
    expect(content).toContain('DESTINO')        // sin pérdida: ambos lados
    expect(content).toContain('ORIGEN')
    // merge sellado con dos padres, y el commit dice SIN VERIFICAR
    const parents = execFileSync('git', ['-C', dir, 'rev-list', '--parents', '-n', '1', 'HEAD'], { encoding: 'utf8' }).trim().split(' ')
    expect(parents.length).toBe(3)
    const body = execFileSync('git', ['-C', dir, 'log', '-1', '--format=%b'], { encoding: 'utf8' })
    expect(body).toContain('SIN VERIFICAR')
  })

  test('sin resolutor: el conflicto ABORTA (conducta segura por defecto)', () => {
    const dir = synthConflictRepo()
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }])
    expect(res.merge).toBe('conflict')
    expect(res.conflictFiles).toContain('file.txt')
    expect(execFileSync('git', ['-C', dir, 'status', '--porcelain'], { encoding: 'utf8' }).trim()).toBe('')
  })

  test('gate estático en línea RECHAZA la unión → aborta (control que puede fallar)', () => {
    const dir = synthConflictRepo()
    const rechaza: StaticGate = () => ({ ok: false, detail: 'gate de prueba rechaza' })
    const [res] = integrate([{ path: dir, source: 'source', target: 'target' }], { conflictResolver: unionConflictResolver, staticGates: rechaza })
    expect(res.merge).toBe('conflict')
    expect(res.message).toContain('gate estático')
    // abortado: árbol limpio, HEAD sin merge sellado
    expect(execFileSync('git', ['-C', dir, 'status', '--porcelain'], { encoding: 'utf8' }).trim()).toBe('')
    const parents = execFileSync('git', ['-C', dir, 'rev-list', '--parents', '-n', '1', 'HEAD'], { encoding: 'utf8' }).trim().split(' ')
    expect(parents.length).toBe(2)
  })
})
