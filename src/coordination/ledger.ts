/**
 * El hogar declarado del ledger de reservas de coordinación.
 *
 * De dónde sale, y qué NO se muda
 * --------------------------------
 * P3a del orden de mudanza (`docs: analisis-orden-interno-de-p3`) mide el
 * subárbol `.claude/coordination/`: **un archivo**, `claims.jsonl`, y **una**
 * cita ejecutable, la constante `DEFAULT_LEDGER_REL` de
 * `docs: .claude/packages/harness/src/cowork/claims.ts:34`.
 *
 * El archivo NO viaja. Es estado por repositorio —las reservas de un clon
 * hablan de las rutas de ese clon— y DEC-01 lo deja donde está: producto en
 * `src/`, estado en `.claude/`. Lo que sí es producto, y es lo que este módulo
 * recibe, es la **convención de ubicación** y su precondición.
 *
 * Por qué la convención necesitaba hogar propio
 * ----------------------------------------------
 * Vivía como literal dentro de un módulo del harness, que es una segunda
 * fuente de verdad para una ubicación — lo mismo que `paths/reach.py` existe
 * para evitar del lado Python. Y al medirla se destaparon dos defectos, los
 * dos silenciosos, con sonda en
 * `docs: .claude/eventos/hogar-del-ledger-de-coordinacion-20260905T122607/`:
 *
 * 1. **Fuera de un repositorio el ledger se escribía igual.** La cabecera del
 *    mecanismo declara que el estado compartido va en texto versionado
 *    *porque* «git lo fusiona línea a línea»; la sonda escribió el archivo en
 *    un temporal sin `.git` y `git status` respondió `not a git repository`.
 *    El archivo existía y la propiedad que justifica su formato, no.
 * 2. **Dos subdirectorios del mismo repo no compartían ledger.** Resolviendo
 *    contra el `cwd`, una reserva desde la raíz y otra desde
 *    `packages/harness` aterrizan en archivos distintos. Medido: el gate de
 *    solape vio **0** solapes donde había 1. Es un verde que no discrimina —
 *    el mecanismo reporta sano justo cuando ha dejado de servir.
 *
 * El segundo es el caro: el primero al menos deja un archivo huérfano que
 * alguien puede notar; el segundo deja dos ledgers sanos que no se ven.
 *
 * Qué hace este módulo
 * ---------------------
 * Resuelve la ruta contra el **top level** del repositorio, y **rehúsa
 * nombrando** cuando no hay repositorio, en vez de fabricar una ruta fuera de
 * control de versiones. La ruta explícita sigue siendo la vía de escape: quien
 * la nombra ya decidió, y no se le comprueba.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

/** Ruta del ledger, relativa al top level del repositorio. Fuente única. */
export const LEDGER_REL = '.claude/coordination/claims.jsonl'

/** No hay repositorio del que colgar el ledger. Rehúsa nombrando el directorio. */
export class CoordinationRootError extends Error {
  constructor(start: string) {
    super(
      `no hay repositorio git en '${start}' ni por encima: el ledger de ` +
        'coordinación se fusiona línea a línea con git, así que fuera de un ' +
        'repositorio no tiene la propiedad por la que existe. Nombra una ruta ' +
        'explícita si de verdad quieres escribir ahí.',
    )
    this.name = 'CoordinationRootError'
  }
}

/**
 * Cómo se resuelve el top level. Es un parámetro para que un control pueda
 * retirarlo: sustituido por uno que no asciende, tienen que caer exactamente
 * las aserciones que dependen de él.
 */
export type RepoResolver = (start: string) => string | null

/**
 * El top level del repositorio que contiene `start`, o `null` si no hay
 * ninguno. Devuelve en vez de lanzar: quién convierte la ausencia en error es
 * decisión del llamador, no de la medición.
 */
export function gitTopLevel(start: string): string | null {
  try {
    return execFileSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

export interface LedgerPathOptions {
  /** Ruta ya decidida por el llamador. No se comprueba. */
  explicit?: string
  /** Cómo se resuelve el top level. Por defecto, git. */
  resolver?: RepoResolver
}

/**
 * La ruta del ledger para el repositorio que contiene `start`.
 *
 * Con `explicit` devuelve esa ruta tal cual. Sin ella, asciende al top level y
 * cuelga `LEDGER_REL`; si no hay repositorio, lanza `CoordinationRootError`
 * **sin escribir nada**.
 */
export function ledgerPathFor(start: string, opts: LedgerPathOptions = {}): string {
  if (opts.explicit !== undefined) return opts.explicit
  const resolver = opts.resolver ?? gitTopLevel
  const top = resolver(start)
  if (top === null) throw new CoordinationRootError(start)
  return join(top, LEDGER_REL)
}
