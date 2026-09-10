/**
 * `--select-tests` (T-050): el subconjunto derivado, impreso y NO ejecutado.
 *
 * Que sea un comando y no una biblioteca es lo que lo hace usable desde
 * cualquier repo, incluidos los cuatro que no son este paquete. Y que imprima
 * en vez de ejecutar es deliberado: quien decide correr es quien lee la
 * ceguera, no el selector.
 *
 * Extraído de `bin/harness.ts` en #205 sin cambio de conducta.
 */
import { join } from 'node:path'
import { loadSettings } from '@thyrox/config/load'
import { selectTests, type ImpactConfig } from '../testing/impact.ts'
import { changedPaths, fsIo } from '../testing/io.ts'
import { flag } from '../entry/flags.ts'

export function selectTestsCommand(argv: string[], cwd: string): number {
  // Lee el settings del PROYECTO sin exigir `--settings-source project`: ese
  // interruptor existe para que una sesión no herede configuración sin
  // pedirlo, y aquí la configuración del proyecto es la premisa del
  // subcomando — sin ella no hay nada que derivar.
  const explicitPath = flag(argv, 'settings')
  const r = explicitPath
    ? loadSettings([{ source: 'flagSettings', path: explicitPath }])
    : loadSettings([
        { source: 'projectSettings', path: join(cwd, '.claude', 'settings.json') },
        { source: 'localSettings', path: join(cwd, '.claude', 'settings.local.json') },
      ])
  for (const e of r.errors) process.stderr.write(`aviso: ${e.path} — ${e.message}\n`)
  const impactConfig = r.settings.testImpact as
    | (Omit<ImpactConfig, 'runner' | 'fullRunner'> & { testGlob: string; runner: string; fullRunner: string })
    | undefined
  if (!impactConfig) {
    // NO se adivina un default: una convención inventada produciría un
    // subconjunto que se lee como derivado siendo adivinado.
    process.stderr.write(
      'Falta `testImpact` en los settings del proyecto: sin él no hay estrategia, ' +
        'corredor ni disparadores transversales que declarar, y adivinarlos daría un ' +
        'subconjunto que parece derivado sin serlo.\n',
    )
    return 2
  }
  const selection = selectTests(changedPaths(cwd), {
    strategy: impactConfig.strategy,
    runner: (paths) => `${impactConfig.runner} ${paths.join(' ')}`,
    fullRunner: impactConfig.fullRunner,
    crossCutting: impactConfig.crossCutting,
    pathPattern: impactConfig.pathPattern,
  }, fsIo(cwd, impactConfig.testGlob))

  const { selected, total } = selection.denominator
  if (selection.crossCutting.triggered) {
    process.stdout.write(
      `· cambio transversal: ${selection.crossCutting.byPath} ` +
        `(regla ${selection.crossCutting.rule})\n`,
    )
  }
  process.stdout.write(selection.command === null
    ? '· sin cambios que impacten pruebas: nada que correr\n'
    : `${selection.command}\n`)
  // El denominador y la ceguera van SIEMPRE: un subconjunto sin ellos se lee
  // como cobertura completa.
  process.stdout.write(`· alcance: ${selected} de ${total} archivos de prueba\n`)
  process.stdout.write(`· Métrica: ${selection.metric}\n`)
  process.stdout.write(`· Ciega a: ${selection.blindTo}\n`)
  return 0
}
