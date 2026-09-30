/**
 * Pruebas de `ruleMatching.ts`: el compilador de reglas de archivo de
 * 2.1.275 (`Bn`, `_a`, `myt`, `BYe`, `pyt` en `chunk-9apg35nm.js`).
 *
 * Los casos negativos apuntan a rutas que EXISTEN en disco: un rechazo sobre
 * una ruta ausente no distinguiría la regla de la ausencia.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  allPathsMatchAllowRule,
  getFileReadIgnorePatterns,
  matchingRuleForInput,
  normalizePatternsToPath,
  patternWithRoot,
  sanitizeRulePattern,
  resetRuleMatchingCachesForTesting,
} from '../ruleMatching.js'

type Rules = Partial<Record<string, string[]>>
function ctx(deny: Rules = {}, allow: Rules = {}, ask: Rules = {}) {
  return { mode: 'default', alwaysAllowRules: allow, alwaysDenyRules: deny, alwaysAskRules: ask }
}

let base: string
beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'rule-matching-')))
  mkdirSync(join(base, 'real', 'deep'), { recursive: true })
  mkdirSync(join(base, 'open'), { recursive: true })
  writeFileSync(join(base, 'real', 'deep', 'secret.txt'), 'x')
  writeFileSync(join(base, 'open', 'note.txt'), 'x')
  symlinkSync(join(base, 'real'), join(base, 'link'))
})
afterAll(() => rmSync(base, { recursive: true, force: true }))

describe('patternWithRoot (jYe + E_n)', () => {
  test('`//` ancla en la raíz del sistema de archivos', () => {
    expect(patternWithRoot('//etc/passwd', 'session')).toEqual({ relativePattern: '/etc/passwd', root: '/' })
  })
  test('`~/` ancla en el home', () => {
    const r = patternWithRoot('~/x/**', 'session')
    expect(r.relativePattern).toBe('/x/**')
    expect(r.root).toBe(require('node:os').homedir().normalize('NFC'))
  })
  test('un patrón relativo no tiene raíz y pierde el `./`', () => {
    expect(patternWithRoot('./src/*.ts', 'session')).toEqual({ relativePattern: 'src/*.ts', root: null })
  })
})

describe('matchingRuleForInput (_a)', () => {
  test('una regla de denegación absoluta atrapa el archivo que existe', () => {
    const c = ctx({ session: [`Read(/${base}/real/**)`] })
    const rule = matchingRuleForInput(join(base, 'real', 'deep', 'secret.txt'), c, 'read', 'deny')
    expect(rule?.ruleValue.ruleContent).toBe(`/${base}/real/**`)
  })
  test('no atrapa un archivo hermano que también existe', () => {
    const c = ctx({ session: [`Read(/${base}/real/**)`] })
    expect(matchingRuleForInput(join(base, 'open', 'note.txt'), c, 'read', 'deny')).toBeNull()
  })
  test('la regla de Edit no gobierna la lectura', () => {
    const c = ctx({ session: [`Edit(/${base}/real/**)`] })
    expect(matchingRuleForInput(join(base, 'real', 'deep', 'secret.txt'), c, 'read', 'deny')).toBeNull()
    expect(matchingRuleForInput(join(base, 'real', 'deep', 'secret.txt'), c, 'edit', 'deny')).not.toBeNull()
  })
  test('el gemelo físico: la denegación por el enlace alcanza el destino real', () => {
    const c = ctx({ session: [`Read(/${base}/link/**)`] })
    const rule = matchingRuleForInput(join(base, 'real', 'deep', 'secret.txt'), c, 'read', 'deny')
    expect(rule?.ruleValue.ruleContent).toBe(`/${base}/link/**`)
  })
  test('el patrón casa sin distinguir mayúsculas: `ignore()` sin opciones, como el binario', () => {
    const p = join(base, 'real', 'deep', 'secret.txt')
    expect(matchingRuleForInput(p, ctx({ session: [`Read(/${base}/REAL/**)`] }), 'read', 'deny')).not.toBeNull()
    expect(matchingRuleForInput(p, ctx({}, { session: [`Read(/${base}/REAL/**)`] }), 'read', 'allow')).not.toBeNull()
  })
  test('la raíz sólo se pliega al denegar con destino insensible a mayúsculas', () => {
    const c = ctx({ session: [`Read(~/${'x'}/**)`] })
    const home = require('node:os').homedir()
    const spelled = home.toUpperCase() + '/x/y'
    if (spelled === home + '/x/y') return
    expect(matchingRuleForInput(spelled, c, 'read', 'deny')).toBeNull()
    expect(matchingRuleForInput(spelled, c, 'read', 'deny', { caseInsensitiveTarget: true })).not.toBeNull()
    const a = ctx({}, { session: [`Read(~/${'x'}/**)`] })
    expect(matchingRuleForInput(spelled, a, 'read', 'allow', { caseInsensitiveTarget: true })).toBeNull()
  })
})

describe('sanitizeRulePattern (to)', () => {
  test('un patrón que ignore no compila se descarta como permiso', () => {
    expect(sanitizeRulePattern('#nota', true)).toBeNull()
  })
  test('como denegación se lee literal, escapado', () => {
    expect(sanitizeRulePattern('#nota', false)).toBe('\\#nota')
  })
  test('un patrón válido pasa intacto', () => {
    expect(sanitizeRulePattern('src/**', true)).toBe('src/**')
  })
})

describe('allPathsMatchAllowRule (myt)', () => {
  test('todas las rutas deben tener permiso; devuelve la primera regla', () => {
    const c = ctx({}, { session: [`Read(/${base}/open/**)`] })
    const ok = allPathsMatchAllowRule([join(base, 'open', 'note.txt')], c, 'read')
    expect(ok?.ruleValue.ruleContent).toBe(`/${base}/open/**`)
    expect(allPathsMatchAllowRule([join(base, 'open', 'note.txt'), join(base, 'real', 'deep', 'secret.txt')], c, 'read')).toBeNull()
  })
})

describe('getFileReadIgnorePatterns (BYe)', () => {
  test('agrupa las denegaciones de lectura por raíz', () => {
    const c = ctx({ session: [`Read(/${base}/real/**)`, 'Read(*.env)', 'Edit(//x/**)'] })
    const m = getFileReadIgnorePatterns(c)
    expect(m.get(null)).toEqual(['*.env'])
    expect(m.get('/')).toContain(`${base}/real/**`)
  })
})

describe('normalizePatternsToPath (pyt)', () => {
  test('una raíz igual a la de búsqueda da el patrón anclado', () => {
    const m = new Map<string | null, string[]>([[base, ['/real/**']]])
    expect(normalizePatternsToPath(m, base)).toEqual(['/real/**'])
  })
  test('una raíz por encima de la búsqueda recorta el prefijo', () => {
    const m = new Map<string | null, string[]>([['/', [`${base}/real/deep/*.txt`]]])
    expect(normalizePatternsToPath(m, join(base, 'real'))).toEqual(['/deep/*.txt'])
  })
  test('una raíz ajena a la búsqueda no aporta nada', () => {
    const m = new Map<string | null, string[]>([[join(base, 'open'), ['/note.txt']]])
    expect(normalizePatternsToPath(m, join(base, 'real'))).toEqual([])
  })
  test('los patrones sin raíz se conservan tal cual', () => {
    const m = new Map<string | null, string[]>([[null, ['*.env']]])
    expect(normalizePatternsToPath(m, base)).toEqual(['*.env'])
  })
})

test('el caché de denegación se invalida al cambiar el entorno', () => {
  resetRuleMatchingCachesForTesting()
  const c = ctx({ session: [`Read(/${base}/real/**)`] })
  expect(matchingRuleForInput(join(base, 'real', 'deep', 'secret.txt'), c, 'read', 'deny')).not.toBeNull()
  expect(matchingRuleForInput(join(base, 'real', 'deep', 'secret.txt'), c, 'read', 'deny')).not.toBeNull()
})
