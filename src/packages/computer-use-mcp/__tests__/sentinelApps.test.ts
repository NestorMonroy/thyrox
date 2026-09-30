/**
 * Las apps «centinela»: escaladas disfrazadas —una terminal, un explorador de
 * archivos, la configuración del sistema— que el diálogo de aprobación marca
 * con una advertencia. No se bloquean; se señalan.
 *
 * El contrato es el de 2.1.283, leído con `bin/binary` (banco
 * `napi-contracts-20260927T073211`, `binary-sentinel-apps.txt` y
 * `binary-sentinel-category.txt`): `chunk-de3xpxbw.js` declara los conjuntos
 * `$Ge` (shell, 17 ids de macOS), `VGe` (filesystem), `KGe` (system settings),
 * y la rama de Windows —`Gzt` (19 ejecutables de shell), `Qzt` (prefijos de
 * paquete), `zzt`, `Jzt`, `Zzt`—; `LB` decide la categoría, con el
 * ejecutable de Windows reducido a su nombre en minúsculas (`Vzt`). La unión
 * `tKn` (nuestro `SENTINEL_BUNDLE_IDS`) sólo junta los tres de macOS.
 *
 * Medido al escribir estas pruebas: el porte tenía 9 de los 17 ids de shell de
 * macOS y ninguna de la rama de Windows. Las tablas de abajo son las del
 * binario, verbatim.
 *
 * Control de anulación, medido: sin pasar el ejecutable a minúsculas, o sin
 * quitarle la ruta, caen 5 y 7; sin los prefijos de la tienda, el 6; sin un id
 * de macOS (Ghostty), 1 y 3; sin `explorer.exe`, el 7.
 */
import { describe, expect, test } from 'bun:test'
import { SENTINEL_BUNDLE_IDS, getSentinelCategory } from '../src/sentinelApps.ts'

/** `$Ge` de 2.1.283. */
const MAC_SHELL = [
  'com.apple.Terminal', 'com.googlecode.iterm2', 'com.microsoft.VSCode', 'dev.warp.Warp-Stable',
  'com.github.wez.wezterm', 'org.alacritty', 'io.alacritty', 'net.kovidgoyal.kitty', 'co.zeit.hyper',
  'com.mitchellh.ghostty', 'com.todesktop.230313mzl4w4u92', 'com.vscodium', 'com.exafunction.windsurf',
  'dev.zed.Zed', 'org.tabby', 'com.jetbrains.intellij', 'com.jetbrains.pycharm',
]

/** `Gzt` de 2.1.283. */
const WINDOWS_SHELL = [
  'cmd.exe', 'powershell.exe', 'pwsh.exe', 'wt.exe', 'windowsterminal.exe', 'code.exe', 'cursor.exe',
  'vscodium.exe', 'windsurf.exe', 'zed.exe', 'alacritty.exe', 'wezterm-gui.exe', 'warp.exe', 'hyper.exe',
  'tabby.exe', 'idea64.exe', 'pycharm64.exe', 'conemu.exe', 'conemu64.exe',
]

describe('sentinelApps — macOS', () => {
  test('1. los 17 ids de shell de la referencia son «shell»', () => {
    expect(MAC_SHELL.filter(id => getSentinelCategory(id) !== 'shell')).toEqual([])
  })

  test('2. Finder es «filesystem» y Preferencias del Sistema, «system_settings»', () => {
    expect(getSentinelCategory('com.apple.finder')).toBe('filesystem')
    expect(getSentinelCategory('com.apple.systempreferences')).toBe('system_settings')
  })

  test('3. la unión son exactamente los tres conjuntos de macOS, como tKn', () => {
    expect([...SENTINEL_BUNDLE_IDS].sort())
      .toEqual([...MAC_SHELL, 'com.apple.finder', 'com.apple.systempreferences'].sort())
  })

  test('4. una app cualquiera no es centinela, y el id se compara exacto', () => {
    expect(getSentinelCategory('com.apple.Safari')).toBeNull()
    expect(getSentinelCategory('com.apple.terminal')).toBeNull()
  })
})

describe('sentinelApps — Windows', () => {
  test('5. los 19 ejecutables de shell, por nombre, sin importar ruta ni mayúsculas', () => {
    expect(WINDOWS_SHELL.filter(exe => getSentinelCategory(exe) !== 'shell')).toEqual([])
    expect(getSentinelCategory('C:\\Windows\\System32\\CMD.EXE')).toBe('shell')
    expect(getSentinelCategory('C:/Program Files/PowerShell/7/pwsh.exe')).toBe('shell')
  })

  test('6. los paquetes de Terminal y PowerShell de la tienda son «shell» por prefijo', () => {
    expect(getSentinelCategory('Microsoft.WindowsTerminal_8wekyb3d8bbwe!App')).toBe('shell')
    expect(getSentinelCategory('Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe!App')).toBe('shell')
    expect(getSentinelCategory('Microsoft.PowerShell_8wekyb3d8bbwe!App')).toBe('shell')
  })

  test('7. el Explorador es «filesystem»; Configuración y el Panel, «system_settings»', () => {
    expect(getSentinelCategory('C:\\Windows\\explorer.exe')).toBe('filesystem')
    expect(getSentinelCategory('C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe')).toBe('system_settings')
    expect(getSentinelCategory('windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel'))
      .toBe('system_settings')
  })

  test('8. un ejecutable cualquiera no es centinela', () => {
    expect(getSentinelCategory('C:\\Program Files\\Notepad++\\notepad++.exe')).toBeNull()
  })
})
