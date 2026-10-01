/**
 * El catálogo de claves del storage de sesión (`chunk-qbkceaaj.js` de
 * 2.1.283): constructores, forma canónica y reglas de segmento.
 */
import { describe, expect, test } from 'bun:test'

import {
  NAME_VARIANT_CACHE_LIMIT,
  TEAM_SEGMENT,
  bridgeSpawnKey,
  isAsideName,
  isJsonlName,
  isTempArtifactName,
  isValidPathSegment,
  isValidPathSegments,
  marketplaceCacheKey,
  nameVariantCacheSize,
  nameVariants,
  sameStorageKey,
  storageKeyIdentity,
  storageKeyTuple,
  storageKeys,
  transcriptRootKey,
} from '../src/storageKeys.ts'

describe('reglas de nombre', () => {
  test('nameVariants (cK): minúsculas, sin puntos ni espacios finales, y lo previo a los dos puntos', () => {
    expect(nameVariants('Foo. .')).toEqual(['foo'])
    expect(nameVariants('A.txt:Stream ')).toEqual(['a.txt:stream', 'a.txt'])
    expect(Object.isFrozen(nameVariants('x'))).toBe(true)
    expect(nameVariants('mismo')).toBe(nameVariants('mismo'))
  })

  test('la caché de variantes se vacía al llegar a su tope', () => {
    expect(NAME_VARIANT_CACHE_LIMIT).toBe(32768)
    for (let index = 0; nameVariantCacheSize() < NAME_VARIANT_CACHE_LIMIT; index++) nameVariants(`relleno-${index}`)
    expect(nameVariantCacheSize()).toBe(NAME_VARIANT_CACHE_LIMIT)
    nameVariants('uno-mas')
    expect(nameVariantCacheSize()).toBe(1)
  })

  test('isAsideName (qBt) exige el punto inicial y reconoce la forma con flujo alterno', () => {
    expect(isAsideName('.0123456789abcdef.aside')).toBe(true)
    expect(isAsideName('.0123456789ABCDEF.ASIDE. ')).toBe(true)
    expect(isAsideName('.0123456789abcdef.aside:x')).toBe(true)
    expect(isAsideName('0123456789abcdef.aside')).toBe(false)
    expect(isAsideName('.0123456789abcdeg.aside')).toBe(false)
  })

  test('isTempArtifactName (_Uo): temporales de escritura y de purga', () => {
    expect(isTempArtifactName('.0123456789abcdef.tmp')).toBe(true)
    expect(isTempArtifactName('.0123456789abcdef.tmp~')).toBe(true)
    expect(isTempArtifactName('state.json.tmp.0a1b2c3d')).toBe(true)
    expect(isTempArtifactName('state.json.tmp~0a1b2c3d')).toBe(true)
    expect(isTempArtifactName('x.purge.01234567-89ab-cdef-0123-456789abcdef.tmp')).toBe(true)
    expect(isTempArtifactName('state.json')).toBe(false)
  })

  test('isValidPathSegment (jn) e isValidPathSegments (sR)', () => {
    expect(isValidPathSegment('state.json')).toBe(true)
    for (const bad of ['', '.', '..', ' . ', 'a/b', 'a\\b', `a${String.fromCharCode(0)}`, '.0123456789abcdef.aside', 7, undefined]) expect(isValidPathSegment(bad)).toBe(false)
    expect(isValidPathSegments(['a', 'b'])).toBe(true)
    expect(isValidPathSegments([])).toBe(false)
    expect(isValidPathSegments(['a', '..'])).toBe(false)
  })

  test('isJsonlName (KBt) mira también la forma recortada', () => {
    expect(isJsonlName('t.JSONL. ')).toBe(true)
    expect(isJsonlName('t.jsonl:alt')).toBe(true)
    expect(isJsonlName('t.json')).toBe(false)
    expect(TEAM_SEGMENT).toBe('team')
  })
})

describe('constructores de clave (Re)', () => {
  test('transcript y log añaden sólo los campos opcionales presentes', () => {
    expect(storageKeys.transcript('p', 's')).toEqual({ namespace: 'transcript', projectKey: 'p', sessionId: 's' })
    expect(storageKeys.transcript('p', 's', 'a', ['r'])).toEqual({ namespace: 'transcript', projectKey: 'p', sessionId: 's', agentId: 'a', agentRelPath: ['r'] })
    expect('agentId' in storageKeys.transcript('p', 's', undefined, ['r'])).toBe(false)
    expect(storageKeys.log('s', 'c')).toEqual({ namespace: 'log', sessionId: 's', channel: 'c' })
    expect(storageKeys.log('s', 'c', { agentId: 'a', runId: 'r' })).toEqual({ namespace: 'log', sessionId: 's', channel: 'c', agentId: 'a', runId: 'r' })
  })

  test('los demás constructores', () => {
    expect(storageKeys.session('1.json')).toEqual({ namespace: 'session', file: '1.json' })
    expect(storageKeys.job('j', ['state.json'])).toEqual({ namespace: 'job', jobId: 'j', relPath: ['state.json'] })
    expect(storageKeys.jobPins()).toEqual({ namespace: 'jobsRoot', file: 'pins' })
    expect(storageKeys.sessionLog('p', { year: 2026, month: 9, day: 28 }, 'x')).toEqual({ namespace: 'sessionLog', projectKey: 'p', year: 2026, month: 9, day: 28, logName: 'x' })
    expect(storageKeys.agentMemory('t', ['r'])).toEqual({ namespace: 'agentMemory', layer: 'user', agentType: 't', relPath: ['r'] })
    expect(transcriptRootKey('p', 's')).toEqual({ namespace: 'transcript', projectKey: 'p', sessionId: 's', agentRelPath: [] })
    expect(bridgeSpawnKey()).toEqual({ namespace: 'bridgeSpawn' })
    expect(marketplaceCacheKey('m')).toEqual({ namespace: 'marketplaceCache', marketplace: 'm' })
    expect(marketplaceCacheKey('m', [])).toEqual({ namespace: 'marketplaceCache', marketplace: 'm' })
    expect(marketplaceCacheKey('m', ['a'])).toEqual({ namespace: 'marketplaceCache', marketplace: 'm', relPath: ['a'] })
  })
})

describe('forma canónica (K, mhn, SUo)', () => {
  test('las tres formas de transcript', () => {
    expect(storageKeyTuple(storageKeys.journal('p', 's', ['a']))).toEqual(['transcript', 'p', 's', null, ['a'], 'journal'])
    expect(storageKeyTuple(storageKeys.sessionJournal('p', 's', 'j'))).toEqual(['transcript', 'p', 's', null, null, 'j'])
    expect(storageKeyTuple(storageKeys.transcript('p', 's'))).toEqual(['transcript', 'p', 's', null, null])
  })

  test('las ramas con alternativa', () => {
    expect(storageKeyTuple(storageKeys.globalConfig())).toEqual(['globalConfig'])
    expect(storageKeyTuple(storageKeys.globalConfigCopy('k', 't'))).toEqual(['globalConfig', 'k', 't'])
    expect(storageKeyTuple(storageKeys.userSettings())).toEqual(['settings', 'user'])
    expect(storageKeyTuple(storageKeys.projectSettings('p'))).toEqual(['settings', 'project', 'p'])
    expect(storageKeyTuple(storageKeys.localSettings('c'))).toEqual(['settings', 'local', 'c'])
    expect(storageKeyTuple(storageKeys.taskListMeta('l'))).toEqual(['task', 'l', true])
    expect(storageKeyTuple(storageKeys.taskListHighWaterMark('l'))).toEqual(['task', 'l', ['highWaterMark']])
    expect(storageKeyTuple(storageKeys.task('l', 't'))).toEqual(['task', 'l', 't'])
    expect(storageKeyTuple(storageKeys.marketplaceTree('m', ['a']))).toEqual(['marketplaceCache', 'm', ['a']])
    expect(storageKeyTuple(storageKeys.marketplaceCache('m', 'f'))).toEqual(['marketplaceCache', 'm', 'f'])
    expect(storageKeyTuple(storageKeys.jobPins())).toEqual(['jobsRoot', 'pins'])
    expect(storageKeyTuple(storageKeys.jobDraft('d'))).toEqual(['jobsRoot', 'draft', 'd'])
    expect(storageKeyTuple({ namespace: 'agentMemory', layer: 'project', projectKey: 'p', agentType: 't', relPath: [] })).toEqual(['agentMemory', 'project', 'p', 't', []])
    expect(storageKeyTuple(storageKeys.agentMemory('t', []))).toEqual(['agentMemory', 'user', null, 't', []])
    expect(storageKeyTuple(storageKeys.log('s', 'c'))).toEqual(['log', 's', 'c', null, null])
    expect(storageKeyTuple({ namespace: 'desconocido' })).toBeUndefined()
    expect(storageKeyIdentity({ namespace: 'desconocido' })).toBeUndefined()
  })

  test('el orden de los campos no cambia la identidad', () => {
    expect(sameStorageKey({ namespace: 'job', jobId: 'j', relPath: ['a'] }, { relPath: ['a'], jobId: 'j', namespace: 'job' })).toBe(true)
    expect(sameStorageKey(storageKeys.job('j', ['a']), storageKeys.job('j', ['b']))).toBe(false)
    expect(storageKeyIdentity(storageKeys.session('x'))).toBe('["session","x"]')
  })
})
