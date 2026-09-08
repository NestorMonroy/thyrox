/**
 * `--claim` / `--release` / `--who-has` / `--overlap` (T-101): el claim ledger.
 *
 * Extraído de `bin/harness.ts` en #205 sin cambio de conducta.
 */
import {
  appendClaim, findOverlaps, ledgerPathFor, newClaimId, readLedger, whoHas,
  type ClaimRecord,
} from '../../../../coordination/claims.ts'
import { flag, hasFlag } from '../entry/flags.ts'

export function claimsCommand(argv: string[], cwd: string): number {
  const ledger = ledgerPathFor(cwd, { explicit: flag(argv, 'ledger') })

  if (hasFlag(argv, 'overlap')) {
    const pairs = findOverlaps(readLedger(ledger))
    if (pairs.length === 0) {
      process.stdout.write('· sin solapes entre dueños distintos.\n')
      return 0
    }
    for (const [a, b] of pairs) {
      process.stdout.write(`SOLAPE  «${a.owner}» (${a.path}) ↔ «${b.owner}» (${b.path})\n`)
    }
    return 3
  }

  const whoPath = flag(argv, 'who-has')
  if (whoPath !== undefined) {
    const held = whoHas(readLedger(ledger), whoPath)
    if (held.length === 0) {
      process.stdout.write(`· nadie tiene reservas que solapen «${whoPath}».\n`)
      return 0
    }
    for (const c of held) {
      process.stdout.write(`${c.owner}\t${c.path}\t${c.branch}${c.task ? `\t${c.task}` : ''}\t${c.id}\n`)
    }
    return 0
  }

  const claimPath = flag(argv, 'claim')
  const releasePath = flag(argv, 'release')
  const target = claimPath ?? releasePath
  if (target === undefined) {
    process.stderr.write('Falta la ruta: --claim <ruta> | --release <ruta> | --who-has <ruta> | --overlap\n')
    return 2
  }
  const owner = flag(argv, 'owner')
  if (!owner) {
    process.stderr.write('Falta --owner <quién reserva>.\n')
    return 2
  }
  const branch = flag(argv, 'branch') ?? ''
  const op: ClaimRecord['op'] = claimPath !== undefined ? 'claim' : 'release'

  if (op === 'claim') {
    if (!branch) {
      process.stderr.write('Falta --branch <rama> para reservar.\n')
      return 2
    }
    // Surfacea el solape ANTES de escribir: rehúsa doblar la reserva de otro
    // dueño salvo --force. Es la mitad «que no se estén tocando los mismos
    // archivos» de la directiva.
    const ajenos = whoHas(readLedger(ledger), target).filter((c) => c.owner !== owner)
    if (ajenos.length > 0 && !hasFlag(argv, 'force')) {
      for (const c of ajenos) {
        process.stderr.write(`CONFLICTO  «${c.owner}» ya tiene «${c.path}» (rama ${c.branch}); usa --force para reservar igual.\n`)
      }
      return 3
    }
  }

  const rec: ClaimRecord = {
    id: newClaimId(),
    op,
    path: target,
    owner,
    branch,
    at: new Date().toISOString(),
  }
  const task = flag(argv, 'task')
  if (task) rec.task = task
  appendClaim(ledger, rec)
  process.stdout.write(`${op === 'claim' ? 'reservado' : 'liberado'}: ${JSON.stringify(rec)}\n`)
  return 0
}
