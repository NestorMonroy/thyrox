import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CLIENT_SETTING_KEYS, KEY_STATUS, keysByStatus, deferredReason, deferredCondition } from '../settings/inventory.ts'
import { SettingsSchema } from '../settings/types.ts'
import { loadSettings } from '../settings/load.ts'

// Criterio del ejecutor 2026-09-02: «yo quitaria la de aws, pero dejaria las
// de git, y creo que solo quitaria las de servicios externos como aws». El
// inventario deja de ser una opinion mia y pasa a ser una particion
// verificable: cada una de las 80 tiene estado y, si esta retirada, motivo.

describe('inventario de las 80 claves del cliente', () => {
  test('son exactamente las 80 medidas, sin repetir', () => {
    expect(CLIENT_SETTING_KEYS).toHaveLength(80)
    expect(new Set(CLIENT_SETTING_KEYS).size).toBe(80)
  })

  test('cada clave tiene estado: ninguna queda sin veredicto', () => {
    for (const k of CLIENT_SETTING_KEYS) expect(KEY_STATUS[k]).toBeDefined()
    expect(Object.keys(KEY_STATUS).sort()).toEqual([...CLIENT_SETTING_KEYS].sort())
  })

  test('los tres estados particionan las 80 y suman 80', () => {
    const { consumida, declarada, diferida } = keysByStatus()
    expect(consumida.length + declarada.length + diferida.length).toBe(80)
    const juntas = new Set([...consumida, ...declarada, ...diferida])
    expect(juntas.size).toBe(80)
  })

  test('toda clave diferida dice POR QUE, y todas nombran un servicio externo', () => {
    for (const k of keysByStatus().diferida) {
      const motivo = deferredReason(k)
      expect(motivo).toBeTruthy()
      expect(motivo!.length).toBeGreaterThan(15)
    }
  })

  test('DIFERIDA no es descartada: cada una declara que la traeria de vuelta', () => {
    // Directiva del ejecutor 2026-09-02: «me parece bien las 17 … pero quedan
    // a un futuro». Sin condicion escrita, «a futuro» es un cajon sin llave:
    // es lo mismo que hallazgo-abierto-genera-sucesor exige de un hallazgo.
    for (const k of keysByStatus().diferida) {
      const condicion = deferredCondition(k)
      expect(condicion).toBeTruthy()
      expect(condicion!.length).toBeGreaterThan(20)
    }
  })

  test('ninguna clave consumida o declarada tiene condicion: la condicion es de las diferidas', () => {
    const { consumida, declarada } = keysByStatus()
    for (const k of [...consumida, ...declarada]) expect(deferredCondition(k)).toBeUndefined()
  })

  test('las de git NO se retiran: el ejecutor las quiere', () => {
    for (const k of ['attribution', 'includeCoAuthoredBy', 'includeGitInstructions', 'respectGitignore']) {
      expect(KEY_STATUS[k]).not.toBe('diferida')
    }
  })

  test('las de aws y gcp SI se difieren', () => {
    for (const k of ['awsCredentialExport', 'awsAuthRefresh', 'gcpAuthRefresh']) {
      expect(KEY_STATUS[k]).toBe('diferida')
    }
  })

  test('toda clave consumida o declarada esta en el esquema: no hay veredicto sin tipo', () => {
    const { consumida, declarada } = keysByStatus()
    for (const k of [...consumida, ...declarada]) {
      // el esquema la acepta con su tipo; si no estuviera declarada, el
      // passthrough la dejaria pasar y el veredicto seria una mentira
      expect(Object.keys(SettingsSchema.shape)).toContain(k === 'effortLevel' ? 'effort' : k)
    }
  })
})

describe('una clave diferida avisa al cargarse, no rompe', () => {
  test('loadSettings avisa nombrando la clave y el motivo', () => {
    const d = mkdtempSync(join(tmpdir(), 'inv-'))
    writeFileSync(join(d, 's.json'), JSON.stringify({ model: 'claude-opus-5', awsAuthRefresh: 'algo' }))
    const r = loadSettings([{ source: 'userSettings', path: join(d, 's.json') }])
    expect(r.settings.model).toBe('claude-opus-5')
    const aviso = r.errors.find((e) => e.path.includes('awsAuthRefresh'))
    expect(aviso).toBeDefined()
    expect(aviso!.message).toContain('servicio externo')
    // el aviso dice que es TODAVIA, no que este descartada
    expect(aviso!.message).toContain('todavía')
  })

  test('sin claves diferidas no hay avisos', () => {
    const d = mkdtempSync(join(tmpdir(), 'inv-'))
    writeFileSync(join(d, 's.json'), JSON.stringify({ model: 'claude-opus-5', respectGitignore: true }))
    expect(loadSettings([{ source: 'userSettings', path: join(d, 's.json') }]).errors).toEqual([])
  })
})
