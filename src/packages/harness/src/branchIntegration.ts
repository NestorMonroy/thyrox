/**
 * Integración de una rama en otra — abstracta, cualquier origen a cualquier destino.
 *
 * El procedimiento existía sólo como memoria episódica en el ``git log`` (commits
 * ``Merge feature/kaupamex-l3 into feature/kaupamex-l2``); ``git-flow.md`` R-04
 * no tiene cláusula ``feature/* → feature/*`` (:ref:`h-docs-1023`). Este módulo lo
 * hace ejecutable y lo fija como procedimiento
 * (:ref:`analisis-procedimiento-de-integracion-entre-ramas`).
 *
 * No nombra ninguna rama ni ningún repo: un ``source`` se integra en un ``target``,
 * en cada repo que tenga la divergencia. Las siete invariantes del análisis:
 *
 *  1. se fusiona HACIA el destino; nunca se empuja al origen (rama viva de otra sesión);
 *  2. merge commit explícito (``--no-ff``) — preserva el bloque, permite revert quirúrgico;
 *  3. identidad VERIFICADA, no asumida ni mutada (author Nestor, committer jcg-admin);
 *  4. por repo, independiente — «up-to-date» es un desenlace válido;
 *  5. la colisión de ETIQUETA no bloquea: git la fusiona limpia y se AUTO-RENUMERA
 *     el lado ``source`` al ID libre post-merge (mecánica, no decide contenido);
 *     sólo bloquea el solape de ARCHIVOS no auto-resoluble (binario sin driver);
 *  6. el origen se ancla a un SHA al integrar; se fusiona ese SHA;
 *  7. el CONFLICTO DE CÓDIGO lo decide el ejecutor: se aborta el merge y se reportan
 *     los archivos (una colisión de etiqueta no es un conflicto de código).
 *
 * FRONTERA DURA (directiva del ejecutor: *«nosotros solo integramos, no corremos aun
 * api, ni nada»*): ``integrate`` fusiona y se detiene; NO corre pytest, jest ni ningún
 * gate de código. La verificación es ``verificationPlan``, que devuelve la LISTA de gates
 * y NUNCA los ejecuta. Son dos funciones que no se llaman entre sí.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { combineGates, driverAwareFileOverlapGate } from './cowork/claims.ts'

/** Committer esperado (``git-author-identity.md``): jamás Claude, siempre jcg-admin. */
export const EXPECTED_COMMITTER_NAME = 'jcg-admin'
export const EXPECTED_COMMITTER_EMAIL = '169318663+jcg-admin@users.noreply.github.com'

/** Un repo con la integración a realizar: fusionar ``source`` en ``target`` dentro de ``path``. */
export interface IntegrationRepo {
  /** Ruta local del working tree del DESTINO (donde vive ``target``). */
  path: string
  /** Ref del origen a integrar, git-grep-able (p. ej. ``origin/feature/kaupamex-l3``). */
  source: string
  /** Ref del destino, git-grep-able (la rama local; el merge cae aquí). */
  target: string
}

/** Resultado de medir colisiones de ID entre origen y destino, ANTES de fusionar. */
export interface CollisionCheck {
  /** ¿Se pudo medir? ``false`` = eje no aplicable a este repo o gate no ejecutable — NO es un verde. */
  ran: boolean
  collisions: number
  detail: string
}

/** Mide colisiones ``(source, target)`` de un repo. Ausente = el eje no se mide (se declara). */
export type CollisionGate = (repo: IntegrationRepo) => CollisionCheck

/** Una etiqueta que colisionaba y se renumeró automáticamente al integrar. */
export interface RenumberedLabel {
  /** La etiqueta original en conflicto, p. ej. ``.. _h-docs-1025:``. */
  label: string
  /** La etiqueta nueva asignada al lado ``source``, p. ej. ``.. _h-docs-1030:``. */
  newLabel: string
  /** ``[viejo, nuevo]`` si el archivo declarante se renombró; ``null`` si su nombre no codificaba el ID. */
  renamed: [string, string] | null
  /** Archivos del árbol de trabajo cuyas refs se actualizaron. */
  refsEdited: string[]
}

/**
 * Resuelve colisiones de etiqueta DESPUÉS de un merge limpio, renumerando el lado
 * ``source`` al ID libre. Opera sobre el árbol de trabajo (git mv + edición) y NO
 * commitea: el merge commit las incluye. Devolver ``[]`` = nada que renumerar.
 */
export type LabelResolver = (repo: IntegrationRepo) => RenumberedLabel[]

/** Resolución determinista de un conflicto de CÓDIGO. Hoy sólo ``union`` (sin pérdida). */
export interface ConflictResolution {
  strategy: 'union'
  /** Archivos cuyo conflicto se resolvió (contenido/contenido). */
  files: string[]
}

/**
 * Resuelve un conflicto de CÓDIGO por ESTRUCTURA, sin juicio humano ni ``ours``/
 * ``theirs`` a ciegas. Devuelve la resolución (ya aplicada y staged en el árbol) o
 * ``null`` cuando no puede resolverlo mecánicamente (delete/modify, add/add sin
 * base) — ahí NO inventa, difiere al ejecutor.
 */
export type ConflictResolver = (repo: IntegrationRepo, conflictFiles: string[]) => ConflictResolution | null

/**
 * Pre-filtro EN LÍNEA sobre una resolución candidata: los gates ESTÁTICOS del repo
 * (baratos, sin DB, deterministas). ``ok:false`` = la resolución rompió algo evidente
 * → se aborta. La SUITE (cara, con estado, compartida) NO va aquí: es pase aparte
 * (``verificationPlan``), el control que promueve nivel 3 → nivel 2.
 */
export type StaticGate = (repo: IntegrationRepo) => { ok: boolean; detail: string }

export interface IntegrationResult {
  repo: string
  precondition: 'ok' | 'dirty-tree' | 'wrong-committer' | 'unresolved-source'
  sourceSha: string | null
  collision: CollisionCheck
  merge: 'merged' | 'up-to-date' | 'conflict' | 'skipped' | 'label-unresolved' | 'resolved-unverified'
  mergeSha: string | null
  conflictFiles: string[]
  /** Etiquetas auto-renumeradas tras un merge limpio (colisión resuelta, no bloqueada). */
  renumbered: RenumberedLabel[]
  /** Resolución de conflicto de código, si la hubo (nivel 3: SIN VERIFICAR aún). */
  conflictResolution?: ConflictResolution
  message: string
}

export interface IntegrateOptions {
  /**
   * Gate que BLOQUEA antes de fusionar: el solape de archivos que git dejaría caer sin
   * driver (``driverAwareFileOverlapGate`` por defecto). Es la única colisión NO
   * auto-resoluble. Una colisión de etiqueta NO va aquí — se renumera (``labelResolver``).
   */
  blockingGate?: CollisionGate
  /**
   * Mide colisiones de ETIQUETA (``docsLabelCollisionGate`` por defecto). Sólo si mide
   * ≥1 corre el ``labelResolver``; donde no aplica (repo de código) declara ``ran:false``
   * y no se toca nada.
   */
  labelGate?: CollisionGate
  /**
   * Resuelve colisiones de etiqueta tras un merge limpio (``docsLabelRenumber`` por
   * defecto). ``null`` desactiva la auto-resolución (una colisión medida aborta).
   */
  labelResolver?: LabelResolver | null
  /**
   * Resuelve un conflicto de CÓDIGO por estructura (``unionConflictResolver`` es el
   * determinista disponible). Opt-in: sin él, un conflicto ABORTA (conducta segura).
   * Su salida es nivel 3 (``resolved-unverified``): NO se pushea hasta que la suite
   * la acepte en ``verificationPlan``.
   */
  conflictResolver?: ConflictResolver
  /** Pre-filtro estático EN LÍNEA sobre la resolución de conflicto. Ausente = se omite. */
  staticGates?: StaticGate
  /** @deprecated Alias histórico: si se pasa, se usa como gate BLOQUEANTE. */
  collisionGate?: CollisionGate
}

function git(path: string, ...args: string[]): { code: number; out: string; err: string } {
  try {
    const out = execFileSync('git', ['-C', path, ...args], { encoding: 'utf8' })
    return { code: 0, out, err: '' }
  } catch (e) {
    const anyE = e as { status?: number; stdout?: string; stderr?: string }
    return { code: anyE.status ?? 1, out: anyE.stdout ?? '', err: anyE.stderr ?? '' }
  }
}

/**
 * Gate de colisión por defecto: las etiquetas ``.. _h-<capa>-NNN:`` de ``source/**``, que
 * sólo existen en el repo docs. Reusa ``check_ids_entre_ramas.py --entre`` — no reimplementa
 * su criterio (``calibration-verified-numbers.md``: sin segunda fuente de verdad). En un repo
 * sin ese espacio de etiquetas el script no está, la llamada lanza, y se declara ``ran:false``
 * (no medido) en vez de fingir un ``0`` verde (sub-patrón D de ``metrica-decide-la-conclusion``).
 */
export function docsLabelCollisionGate(repo: IntegrationRepo): CollisionCheck {
  try {
    const out = execFileSync(
      'python3',
      ['.claude/scripts/gates/check_ids_entre_ramas.py', '--entre', repo.source, repo.target, '--quiet'],
      { cwd: repo.path, encoding: 'utf8' },
    ).trim()
    const n = Number.parseInt(out, 10)
    if (Number.isNaN(n)) return { ran: false, collisions: 0, detail: `salida no numérica del gate: «${out}»` }
    return { ran: true, collisions: n, detail: `${n} colisión(es) de etiqueta entre ${repo.source} y ${repo.target}` }
  } catch (e) {
    return { ran: false, collisions: 0, detail: `gate de etiquetas no ejecutable en ${repo.path}: ${(e as Error).message}` }
  }
}

/**
 * Gate de colisión POR DEFECTO de ``integrate()``: compone dos ejes ortogonales.
 * ``docsLabelCollisionGate`` atrapa la colisión SEMÁNTICA que git no ve —dos ramas
 * que definen la misma etiqueta ``.. _h-…:`` en archivos distintos fusionan sin
 * conflicto textual y rompen el build Sphinx—; ``driverAwareFileOverlapGate`` atrapa
 * el solape de ARCHIVOS que git dejaría caer (binario sin driver instalado). El store
 * binario, solape siempre presente entre l0 y l2/l3, sólo bloquea mientras su driver
 * ``sqlite-union`` no esté instalado en el clon; con él, va a ``detail`` y no bloquea.
 * En un repo de código el gate de etiquetas declara ``ran:false`` (no aplica) y el de
 * archivos mide — ``combineGates`` no finge un ``0`` verde por el que no aplica.
 */
export const defaultCollisionGate: CollisionGate = combineGates(
  docsLabelCollisionGate,
  driverAwareFileOverlapGate,
)

/** Verifica el committer configurado del repo. Devuelve ``null`` si es correcto; si no, el motivo. */
export function committerMismatch(path: string): string | null {
  const email = git(path, 'config', 'user.email').out.trim()
  const name = git(path, 'config', 'user.name').out.trim()
  if (email !== EXPECTED_COMMITTER_EMAIL || name !== EXPECTED_COMMITTER_NAME) {
    return `committer «${name} <${email}>» ≠ «${EXPECTED_COMMITTER_NAME} <${EXPECTED_COMMITTER_EMAIL}>»`
  }
  return null
}

/**
 * ``LabelResolver`` por defecto: renumera las colisiones de etiqueta del árbol de
 * trabajo ya fusionado, reusando ``renumerar_colision.py`` —no reimplementa el
 * criterio ni el cálculo del ID libre en TS (misma disciplina que el gate)—. En un
 * repo sin espacio de etiquetas el script no halla colisiones y devuelve ``[]``.
 */
export function docsLabelRenumber(repo: IntegrationRepo): RenumberedLabel[] {
  const out = execFileSync(
    'python3',
    ['.claude/scripts/gates/renumerar_colision.py', '--source', repo.source, '--target', repo.target, '--json'],
    { cwd: repo.path, encoding: 'utf8' },
  ).trim()
  return out ? (JSON.parse(out) as RenumberedLabel[]) : []
}

/** Cuenta archivos del árbol de trabajo (bajo ``source/``) que declaran una etiqueta literal. */
function labelFileCount(path: string, label: string): number {
  const out = git(path, 'grep', '-lF', label, '--', 'source/').out
  return out.split('\n').filter((l) => l.trim()).length
}

/**
 * ``ConflictResolver`` determinista por UNIÓN — sin pérdida: no descarta ningún
 * hunk, los concatena (``git merge-file --union`` de base/ours/theirs). Puede dar
 * código semánticamente roto (dos versiones juntas); eso lo decide el control de
 * aceptación (los gates estáticos en línea + la suite en ``verificationPlan``), no
 * el resolutor. Sólo resuelve conflictos contenido/contenido: si a un archivo le
 * falta cualquiera de los tres estados (add/add o delete/modify), devuelve ``null``
 * y difiere al ejecutor — no inventa.
 */
export function unionConflictResolver(repo: IntegrationRepo, conflictFiles: string[]): ConflictResolution | null {
  const files: string[] = []
  for (const f of conflictFiles) {
    const base = git(repo.path, 'show', `:1:${f}`)
    const ours = git(repo.path, 'show', `:2:${f}`)
    const theirs = git(repo.path, 'show', `:3:${f}`)
    if (base.code !== 0 || ours.code !== 0 || theirs.code !== 0) return null
    const dir = mkdtempSync(join(tmpdir(), 'union-'))
    try {
      const pB = join(dir, 'base'); const pO = join(dir, 'ours'); const pT = join(dir, 'theirs')
      writeFileSync(pB, base.out); writeFileSync(pO, ours.out); writeFileSync(pT, theirs.out)
      // git merge-file -p --union <current> <base> <other> → unión por stdout.
      const u = git(repo.path, 'merge-file', '-p', '--union', pO, pB, pT)
      writeFileSync(join(repo.path, f), u.out)
      git(repo.path, 'add', '--', f)
      files.push(f)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  return { strategy: 'union', files }
}

/**
 * Integra ``source`` en ``target`` en cada repo. SÓLO integra: no corre ninguna suite ni gate
 * de código. Un repo por vez, independiente; un desenlace por repo. No empuja: el push lo hace
 * el orquestador una vez, al consolidar (``bash-background-tasks.md``).
 */
export function integrate(repos: IntegrationRepo[], opts: IntegrateOptions = {}): IntegrationResult[] {
  // El bloqueo pre-merge es SÓLO el eje no auto-resoluble (solape de archivos sin
  // driver). La etiqueta NO bloquea: se MIDE (``labelGate``) y, si choca, se RENUMERA
  // post-merge (``resolver``) — sólo donde el espacio de etiquetas existe (docs).
  const blocker = opts.collisionGate ?? opts.blockingGate ?? driverAwareFileOverlapGate
  const labelGate = opts.labelGate ?? docsLabelCollisionGate
  const resolver = opts.labelResolver === undefined ? docsLabelRenumber : opts.labelResolver
  const conflictResolver = opts.conflictResolver
  const staticGates = opts.staticGates
  const results: IntegrationResult[] = []

  for (const repo of repos) {
    const base: IntegrationResult = {
      repo: repo.path,
      precondition: 'ok',
      sourceSha: null,
      collision: { ran: false, collisions: 0, detail: 'no medido aún' },
      merge: 'skipped',
      mergeSha: null,
      conflictFiles: [],
      renumbered: [],
      message: '',
    }

    // 1. Precondición — árbol limpio. Un merge sobre un árbol sucio mezcla trabajo ajeno.
    if (git(repo.path, 'status', '--porcelain').out.trim()) {
      results.push({ ...base, precondition: 'dirty-tree', message: 'árbol de trabajo sucio; no se integra' })
      continue
    }

    // 2. Identidad — se VERIFICA, no se muta (react-verification-gate: un hecho de estado no se asume).
    const mismatch = committerMismatch(repo.path)
    if (mismatch) {
      results.push({ ...base, precondition: 'wrong-committer', message: mismatch })
      continue
    }

    // 3. Anclar origen → SHA. Se fusiona el SHA, no la rama (que puede recibir commits).
    const sha = git(repo.path, 'rev-parse', '--verify', '--quiet', repo.source).out.trim()
    if (!sha) {
      results.push({ ...base, precondition: 'unresolved-source', message: `«${repo.source}» no resuelve` })
      continue
    }

    // 4. Bloqueo pre-merge: SÓLO el eje no auto-resoluble (solape de archivos sin driver).
    //    Una colisión de ETIQUETA no bloquea aquí — se renumera tras el merge (paso 7).
    const collision = blocker(repo)
    if (collision.ran && collision.collisions > 0) {
      results.push({
        ...base, sourceSha: sha, collision,
        message: `bloqueado: ${collision.detail}`,
      })
      continue
    }

    // 5. ¿Ya está integrado? SHA ancestro del destino = no-op válido.
    if (git(repo.path, 'merge-base', '--is-ancestor', sha, 'HEAD').code === 0) {
      results.push({ ...base, sourceSha: sha, collision, merge: 'up-to-date', message: 'Already up to date' })
      continue
    }

    // 6. Merge SIN commit (--no-commit --no-ff): deja los dos lados en el árbol para
    //    renumerar la etiqueta ANTES de sellar; así el árbol nunca queda con la duplicada.
    const subject = `Merge ${repo.source} into ${repo.target}`
    const merge = git(repo.path, 'merge', '--no-commit', '--no-ff', sha)

    if (merge.code !== 0) {
      // Conflicto de CÓDIGO: dos lados tocaron la misma región. Elegir un lado con
      // ``ours``/``theirs`` DESCARTA el hunk del otro. El eje es resolverlo por
      // ESTRUCTURA (unión determinista, sin pérdida) y dejar que un control lo acepte.
      const conflictFiles = git(repo.path, 'diff', '--name-only', '--diff-filter=U').out.split('\n').filter((l) => l.trim())
      // Sin resolutor → conducta segura por defecto: abortar y diferir al ejecutor.
      if (!conflictResolver) {
        git(repo.path, 'merge', '--abort')
        results.push({
          ...base, sourceSha: sha, collision, merge: 'conflict', conflictFiles,
          message: `conflicto de código en ${conflictFiles.length} archivo(s); merge abortado`,
        })
        continue
      }
      // Resolución determinista-estructural. ``null`` = no auto-resoluble → se difiere.
      const resolution = conflictResolver(repo, conflictFiles)
      if (!resolution) {
        git(repo.path, 'merge', '--abort')
        results.push({
          ...base, sourceSha: sha, collision, merge: 'conflict', conflictFiles,
          message: `conflicto de código en ${conflictFiles.length} archivo(s) no auto-resoluble; merge abortado, lo resuelve el ejecutor`,
        })
        continue
      }
      // Pre-filtro EN LÍNEA: gates estáticos (baratos, sin DB). Un control que PUEDE
      // FALLAR: si la unión rompió algo evidente, se aborta. La suite es pase aparte.
      const gateOk = staticGates ? staticGates(repo) : { ok: true, detail: 'sin gates estáticos' }
      if (!gateOk.ok) {
        git(repo.path, 'merge', '--abort')
        results.push({
          ...base, sourceSha: sha, collision, merge: 'conflict', conflictFiles,
          message: `unión rechazada por gate estático (${gateOk.detail}); merge abortado`,
        })
        continue
      }
      // Sellar como NIVEL 3: resuelto pero SIN VERIFICAR. No se pushea hasta que la
      // suite lo acepte en verificationPlan (contrato del orquestador).
      git(repo.path, 'add', '-A')
      const bodyC = `Integración de ${repo.source}@${sha.slice(0, 8)} en ${repo.target}.\n\n` +
        `CONFLICTO DE CÓDIGO AUTO-RESUELTO POR ${resolution.strategy.toUpperCase()}, SIN VERIFICAR.\n` +
        `Nivel 3 (niveles-de-retencion): lo acepta la suite en verificationPlan; NO se\n` +
        `pushea hasta entonces. Archivos: ${resolution.files.join(', ')}.`
      git(repo.path, 'commit', '-m', subject, '-m', bodyC)
      const mergeShaC = git(repo.path, 'rev-parse', 'HEAD').out.trim()
      results.push({
        ...base, sourceSha: sha, collision, merge: 'resolved-unverified', mergeSha: mergeShaC,
        conflictResolution: resolution,
        message: `${conflictFiles.length} conflicto(s) auto-resuelto(s) por ${resolution.strategy} — SIN VERIFICAR (suite pendiente en verificationPlan)`,
      })
      continue
    }

    // 7. Auto-renumerar las colisiones de etiqueta del árbol fusionado, y VERIFICAR con un
    //    control que PUEDE FALLAR (sub-patrón D de metrica-decide-la-conclusion): la etiqueta
    //    original debe quedar en ≤1 archivo y la nueva en exactamente 1. Si no, el resolutor
    //    falló: se aborta en vez de sellar un árbol roto.
    //    El resolutor corre SÓLO si el gate de etiqueta midió una colisión — así no se
    //    invoca en un repo sin espacio de etiquetas (código) ni en un merge limpio.
    const labelHit = labelGate(repo)
    let renumbered: RenumberedLabel[] = []
    if (labelHit.ran && labelHit.collisions > 0) {
      if (!resolver) {
        git(repo.path, 'merge', '--abort')
        results.push({
          ...base, sourceSha: sha, collision, merge: 'label-unresolved',
          message: `${labelHit.collisions} colisión(es) de etiqueta y resolutor desactivado; merge abortado`,
        })
        continue
      }
      try {
        renumbered = resolver(repo)
      } catch (e) {
        git(repo.path, 'merge', '--abort')
        results.push({
          ...base, sourceSha: sha, collision, merge: 'label-unresolved',
          message: `resolutor de etiquetas falló: ${(e as Error).message}; merge abortado`,
        })
        continue
      }
      // Control que PUEDE FALLAR (sub-patrón D): dos instrumentos deben concordar —
      // el gate midió N colisiones y el resolutor debe dejar 0 (cada etiqueta vieja
      // en ≤1 archivo, la nueva en exactamente 1) cubriendo esas N.
      let unresolved: string | null = null
      for (const r of renumbered) {
        if (labelFileCount(repo.path, r.label) > 1 || labelFileCount(repo.path, r.newLabel) !== 1) {
          unresolved = r.label
          break
        }
      }
      if (!unresolved && renumbered.length < labelHit.collisions) {
        unresolved = `${labelHit.collisions - renumbered.length} colisión(es) medidas sin renumerar`
      }
      if (unresolved) {
        git(repo.path, 'merge', '--abort')
        results.push({
          ...base, sourceSha: sha, collision, renumbered, merge: 'label-unresolved',
          message: `renumerado incompleto (${unresolved}); merge abortado (lo detectó el control)`,
        })
        continue
      }
    }

    // 8. Sellar el merge commit. author = Nestor (env GIT_AUTHOR_*), committer = jcg-admin (config).
    git(repo.path, 'add', '-A')
    const renumNote = renumbered.length
      ? `\n\nColisión de etiqueta auto-renumerada (${renumbered.length}): ${renumbered.map((r) => `${r.label}→${r.newLabel}`).join(', ')}.`
      : ''
    const body = `Integración de ${repo.source}@${sha.slice(0, 8)} en ${repo.target}.\n\nSólo integración: no se corre ninguna suite ni gate de código en este\npase (verificación diferida a verificationPlan).${renumNote}`
    git(repo.path, 'commit', '-m', subject, '-m', body)

    const mergeSha = git(repo.path, 'rev-parse', 'HEAD').out.trim()
    results.push({ ...base, sourceSha: sha, collision, renumbered, merge: 'merged', mergeSha, message: subject })
  }

  return results
}

// ---------------------------------------------------------------------------
// verificationPlan — la LISTA de verificación. NUNCA ejecuta nada.
// ---------------------------------------------------------------------------

/** Tipo de repo, para mapear la verificación por naturaleza (no por nombre). */
export type RepoKind = 'python-api' | 'js-ui' | 'docs' | 'shell' | 'generic'

export interface VerificationRepo {
  path: string
  kind: RepoKind
}

export interface VerificationStep {
  repo: string
  kind: RepoKind
  /** Gates que HABRÍA que correr — descripciones, no comandos ejecutados. */
  gates: string[]
  note: string
}

const GATES_BY_KIND: Record<RepoKind, string[]> = {
  'python-api': [
    'gates estáticos: check_no_lazy_imports, check_silent_oks, check-canon, check_identifier_language',
    'pytest del subconjunto DERIVADO del cambio (test-execution-protocol.md), -n 4 con bases calientes',
  ],
  'js-ui': [
    'gate duro de Node v22 antes de npm ci/test',
    'npm run check:lazy · check:canon · stylelint',
    'jest del subconjunto derivado del cambio',
  ],
  docs: [
    'check_ids_entre_ramas · check-ids-duplicados (etiquetas de hallazgo)',
    '@kaupamex/harness: bun run typecheck (src+bin, bloqueante) + bun test',
    'make html (OPCIONAL — no es DoD)',
  ],
  shell: ['bash -n sobre los .sh tocados', 'tests estáticos del repo (sin root ni red)'],
  generic: ['(sin gates declarados para este tipo de repo)'],
}

/**
 * Devuelve, por repo, la lista de gates a correr DESPUÉS de integrar. NUNCA los ejecuta:
 * es la mitad «verificar» de la frontera dura, separada de «integrar» a propósito. El
 * disparo de esta lista es decisión del ejecutor, en un pase posterior.
 */
export function verificationPlan(repos: VerificationRepo[]): VerificationStep[] {
  return repos.map((r) => ({
    repo: r.path,
    kind: r.kind,
    gates: GATES_BY_KIND[r.kind],
    note: 'lista, no ejecución — el disparo es del ejecutor (solo se integró en este pase)',
  }))
}
