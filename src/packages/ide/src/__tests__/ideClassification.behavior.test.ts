/**
 * Puerto de `ccnmt: packages/ide/src/__tests__/ideClassification.behavior.test.ts`.
 * Fija el comportamiento de los helpers de clasificación de IDE: gatean las
 * recomendaciones de instalar el plugin de JetBrains y las features
 * específicas de VSCode.
 *
 * Una clasificación equivocada implica: un usuario en IntelliJ recibe pistas
 * de UI específicas de VSCode (o viceversa); un usuario de JetBrains nunca ve
 * el prompt para instalar el plugin.
 */
import { describe, expect, test } from 'bun:test'
import { isJetBrainsIde, isVSCodeIde } from '../ide.js'

describe('Clasificación de IDE', () => {
  describe('isVSCodeIde', () => {
    test('null → false', () => {
      expect(isVSCodeIde(null)).toBeFalsy()
    })

    test('vscode + forks (cursor, windsurf) se reconocen', () => {
      expect(isVSCodeIde('vscode' as any)).toBe(true)
      expect(isVSCodeIde('cursor' as any)).toBe(true)
      expect(isVSCodeIde('windsurf' as any)).toBe(true)
    })

    test('productos JetBrains → false', () => {
      expect(isVSCodeIde('intellij' as any)).toBeFalsy()
      expect(isVSCodeIde('pycharm' as any)).toBeFalsy()
      expect(isVSCodeIde('webstorm' as any)).toBeFalsy()
    })

    test('terminal desconocida → false (default defensivo)', () => {
      expect(isVSCodeIde('Apple_Terminal' as any)).toBeFalsy()
      expect(isVSCodeIde('iTerm.app' as any)).toBeFalsy()
    })
  })

  describe('isJetBrainsIde', () => {
    test('null → false', () => {
      expect(isJetBrainsIde(null)).toBeFalsy()
    })

    test('los IDE de JetBrains devuelven true (intellij, pycharm, webstorm, etc.)', () => {
      expect(isJetBrainsIde('intellij' as any)).toBe(true)
      expect(isJetBrainsIde('pycharm' as any)).toBe(true)
      expect(isJetBrainsIde('webstorm' as any)).toBe(true)
      expect(isJetBrainsIde('androidstudio' as any)).toBe(true)
      expect(isJetBrainsIde('goland' as any)).toBe(true)
      expect(isJetBrainsIde('rubymine' as any)).toBe(true)
    })

    test('los forks de VSCode → false (exclusión mutua con isVSCodeIde)', () => {
      expect(isJetBrainsIde('vscode' as any)).toBeFalsy()
      expect(isJetBrainsIde('cursor' as any)).toBeFalsy()
      expect(isJetBrainsIde('windsurf' as any)).toBeFalsy()
    })

    test('terminales llanas → false', () => {
      expect(isJetBrainsIde('Apple_Terminal' as any)).toBeFalsy()
    })
  })

  test('isVSCodeIde e isJetBrainsIde son MUTUAMENTE EXCLUSIVOS', () => {
    // El mismo IDE no puede ser ambos. Se fija para todos los IDE conocidos.
    const ides = [
      'vscode',
      'cursor',
      'windsurf',
      'intellij',
      'pycharm',
      'webstorm',
      'androidstudio',
      'goland',
    ]
    for (const ide of ides) {
      const isV = !!isVSCodeIde(ide as any)
      const isJ = !!isJetBrainsIde(ide as any)
      // Exactamente uno de los dos es true para cada IDE conocido.
      expect(isV && isJ).toBe(false)
    }
  })
})
