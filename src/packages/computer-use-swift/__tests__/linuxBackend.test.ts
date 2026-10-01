/**
 * Contrato de `@ant/computer-use-swift` en Linux: pantallas, aplicaciones y
 * capturas por las CLI de X11 (`xrandr`, `xdotool`, `wmctrl`, `scrot`,
 * `gtk-launch`/`xdg-open`), los `.desktop` y `/proc`.
 *
 * Medido con `bin/binary` sobre 2.1.283 (banco
 * `napi-contracts-20260927T073211`): la build de Linux de referencia no tiene
 * este backend —su módulo Swift es de macOS—, así que el contrato es el de las
 * CLI que invoca: qué argumentos reciben y cómo se lee su respuesta.
 *
 * Ninguna de esas CLI está en esta máquina. Cada operación corre en un proceso
 * propio (`fixtures/drive.ts`) con un directorio de CLI falsas delante en el
 * PATH: anotan su argv y responden con la forma de la real. `which` también es
 * falso, para decidir qué herramienta opcional «está instalada».
 *
 * Restricción técnica declarada: el backend sólo se carga en Linux; en otra
 * plataforma estos casos se saltan con esa razón.
 *
 * Los casos 11-13 nacieron en rojo: la captura iba a una ruta FIJA,
 * `/tmp/cu-screenshot.png`, que ignoraba TMPDIR, compartían dos capturas
 * simultáneas y devolvía la anterior si `scrot` fallaba. Ahora sigue la forma
 * del backend de macOS: archivo propio bajo `tmpdir()`, borrado al leerlo.
 *
 * Control de anulación, medido mutando `backends/linux.ts` y restaurándolo:
 * la ruta en `/tmp` o no borrar tumban 11 y 12; un nombre fijo sin borrar,
 * sólo el 13; sin `primary` en la expresión de xrandr, 2 y 3; sin
 * deduplicar, el 5; sin gtk-launch, el 7; sin wmctrl en unhide, el 8; con las
 * NoDisplay visibles, el 9; sin la guarda de WINDOW, el 4.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ComputerUseAPI } from '../src/index.ts'

const onLinux = process.platform === 'linux'
const work = mkdtempSync(join(tmpdir(), 'cu-swift-'))
const bin = join(work, 'bin')
const home = join(work, 'home')
const childTmp = join(work, 'tmp')
const calls = join(work, 'calls')
const DRIVER = join(import.meta.dir, 'fixtures', 'drive.ts')
afterAll(() => rmSync(work, { recursive: true, force: true }))

/** Una CLI falsa: anota `nombre<TAB>argv` y ejecuta `body` (sh). */
function fake(name: string, body = ''): void {
  writeFileSync(join(bin, name),
    `#!/bin/sh\n(IFS='\t'; printf '%s\\t%s\\n' '${name}' "$*") >> '${calls}'\n${body}\n`)
  chmodSync(join(bin, name), 0o755)
}

/** `which` falso: sólo «existen» las herramientas opcionales listadas. */
function installed(...tools: string[]): void {
  fake('which', `case "$1" in ${tools.length ? tools.join('|') : '__ninguna__'}) exit 0 ;; *) exit 1 ;; esac`)
}

function recorded(): string[][] {
  return existsSync(calls)
    ? readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(l => l.split('\t'))
        .filter(([name]) => name !== 'which')
    : []
}

function drive(path: string, ...args: unknown[]): unknown {
  const child = Bun.spawnSync(['bun', DRIVER, path, JSON.stringify(args)], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOME: home, TMPDIR: childTmp },
  })
  if (child.exitCode !== 0) throw new Error(child.stderr.toString())
  return JSON.parse(child.stdout.toString())
}

const XRANDR = [
  'Screen 0: minimum 8 x 8, current 4480 x 1440, maximum 32767 x 32767',
  'eDP-1 connected primary 2560x1440+0+0 (normal left inverted right) 309mm x 174mm',
  'HDMI-1 connected 1920x1080+2560+0 (normal left inverted right) 527mm x 296mm',
  'DP-1 disconnected (normal left inverted right x axis y axis)',
].join('\\n')

beforeEach(() => {
  rmSync(work, { recursive: true, force: true })
  for (const dir of [bin, home, childTmp]) mkdirSync(dir, { recursive: true })
  installed()
  fake('xrandr', `printf '${XRANDR}\\n'`)
})

describe.skipIf(!onLinux)('computer-use-swift — Linux por las CLI de X11', () => {
  test('1. en Linux la API usa el backend, no el sustituto «macOS only»', () => {
    const api = new ComputerUseAPI()
    expect(() => api.display.listAll()).not.toThrow()
  })

  test('2. las pantallas conectadas salen de xrandr, en orden, y la desconectada no cuenta', () => {
    expect(drive('display.listAll')).toEqual([
      { width: 2560, height: 1440, scaleFactor: 1, displayId: 0 },
      { width: 1920, height: 1080, scaleFactor: 1, displayId: 1 },
    ])
    expect(recorded()).toEqual([['xrandr', '--query']])
  })

  test('3. getSize elige por id y cae en la primera si el id no existe; sin pantallas, 1920×1080', () => {
    expect(drive('display.getSize', 1)).toEqual({ width: 1920, height: 1080, scaleFactor: 1, displayId: 1 })
    expect(drive('display.getSize', 9)).toEqual({ width: 2560, height: 1440, scaleFactor: 1, displayId: 0 })
    fake('xrandr', "printf 'Screen 0: minimum 8 x 8\\n'")
    expect(drive('display.listAll')).toEqual([{ width: 1920, height: 1080, scaleFactor: 1, displayId: 0 }])
  })

  test('4. la app bajo un punto sale de la ventana que xdotool reporta y de su /proc', () => {
    fake('xdotool', `case "$1" in mousemove) printf 'X=5\\nY=6\\nSCREEN=0\\nWINDOW=77\\n' ;; getwindowpid) printf '${process.pid}' ;; esac`)
    const exe = Bun.spawnSync(['readlink', '-f', `/proc/${process.pid}/exe`]).stdout.toString().trim()
    const comm = readFileSync(`/proc/${process.pid}/comm`, 'utf8').trim()
    expect(drive('apps.appUnderPoint', 5, 6)).toEqual({ bundleId: exe, displayName: comm })
    expect(recorded()).toEqual([
      ['xdotool', 'mousemove', '--sync', '5', '6', 'getmouselocation', '--shell'],
      ['xdotool', 'getwindowpid', '77'],
    ])
    fake('xdotool', "printf 'X=5\\nY=6\\n'")
    expect(drive('apps.appUnderPoint', 5, 6)).toBeNull()
  })

  test('5. con wmctrl, las apps en marcha salen de sus ventanas, sin pid 0 y sin repetir', () => {
    installed('wmctrl')
    fake('wmctrl', `printf '0x01  0 ${process.pid} host Uno\\n0x02  0 ${process.pid} host Dos\\n0x03  0 0 host Escritorio\\n'`)
    const comm = readFileSync(`/proc/${process.pid}/comm`, 'utf8').trim()
    const running = drive('apps.listRunning') as Array<{ displayName: string }>
    expect(running).toHaveLength(1)
    expect(running[0]!.displayName).toBe(comm)
  })

  test('6. sin wmctrl, las apps en marcha salen de ps, a lo sumo 50', () => {
    const running = drive('apps.listRunning') as Array<{ bundleId: string; displayName: string }>
    expect(running.length).toBeGreaterThan(0)
    expect(running.length).toBeLessThanOrEqual(50)
    for (const app of running) expect(app.bundleId).toMatch(/^\d+$/)
  })

  test('7. abrir usa gtk-launch con el .desktop si está, y si no xdg-open', () => {
    installed('gtk-launch')
    fake('gtk-launch')
    fake('xdg-open')
    drive('apps.open', 'firefox')
    installed()
    drive('apps.open', 'firefox')
    expect(recorded()).toEqual([['gtk-launch', 'firefox.desktop'], ['xdg-open', 'firefox']])
  })

  test('8. mostrar una ventana: por id con wmctrl si está; por nombre con xdotool si no', () => {
    installed('wmctrl')
    fake('wmctrl')
    fake('xdotool')
    drive('apps.unhide', ['0x04000003', 'Firefox'])
    expect(recorded()).toEqual([
      ['wmctrl', '-i', '-R', '0x04000003'],
      ['xdotool', 'search', '--name', 'Firefox', 'windowactivate'],
    ])
  })

  test('9. las apps instaladas salen de los .desktop del usuario, sin las NoDisplay', () => {
    const apps = join(home, '.local', 'share', 'applications')
    mkdirSync(apps, { recursive: true })
    writeFileSync(join(apps, 'editor-de-prueba.desktop'), '[Desktop Entry]\nName=Editor de prueba\nExec=/opt/editor --new %U\n')
    writeFileSync(join(apps, 'oculta-de-prueba.desktop'), '[Desktop Entry]\nName=Oculta\nExec=/opt/oculta\nNoDisplay=true\n')
    const list = drive('apps.listInstalled') as Array<{ bundleId: string; displayName: string; path: string }>
    expect(list.find(a => a.bundleId === 'editor-de-prueba'))
      .toEqual({ bundleId: 'editor-de-prueba', displayName: 'Editor de prueba', path: '/opt/editor' })
    expect(list.some(a => a.bundleId === 'oculta-de-prueba')).toBe(false)
  })

  test('10. sin preparación de pantalla en Linux: nada que activar, ocultar ni mover', () => {
    expect(drive('apps.prepareDisplay', ['a'], 'host')).toEqual({ activated: '', hidden: [] })
    expect(drive('apps.previewHideSet', ['a'])).toEqual([])
    expect(drive('apps.findWindowDisplays', ['a', 'b']))
      .toEqual([{ bundleId: 'a', displayIds: [0] }, { bundleId: 'b', displayIds: [0] }])
  })

  // scrot escribe en la ruta que recibe tras `-o`; el falso escribe ahí bytes conocidos.
  const SCROT = `out=""; prev=""; for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; done; printf 'PNGDATA' > "$out"`

  test('11. la captura va bajo TMPDIR, se devuelve en base64 y no queda en disco', () => {
    fake('scrot', SCROT)
    expect(drive('screenshot.captureExcluding', [], 0.8, 100, 100, 1))
      .toEqual({ base64: Buffer.from('PNGDATA').toString('base64'), width: 1920, height: 1080 })
    const [call] = recorded().filter(([name]) => name === 'scrot')
    expect(call!.slice(0, 2)).toEqual(['scrot', '-o'])
    expect(call![2]!.startsWith(childTmp)).toBe(true)
    expect(readdirSync(childTmp)).toEqual([])
  })

  test('12. la captura de una región pasa x,y,w,h y devuelve ese tamaño', () => {
    fake('scrot', SCROT)
    expect(drive('screenshot.captureRegion', [], 10, 20, 300, 200, 300, 200, 0.8))
      .toEqual({ base64: Buffer.from('PNGDATA').toString('base64'), width: 300, height: 200 })
    const [call] = recorded().filter(([name]) => name === 'scrot')
    expect(call!.slice(0, 4)).toEqual(['scrot', '-a', '10,20,300,200', '-o'])
    expect(call![4]!.startsWith(childTmp)).toBe(true)
    expect(readdirSync(childTmp)).toEqual([])
  })

  test('13. si scrot no escribe, la captura es vacía aunque haya una anterior en disco', () => {
    fake('scrot', SCROT)
    drive('screenshot.captureExcluding', [], 0.8, 100, 100)
    writeFileSync(join(childTmp, 'cu-screenshot.png'), 'ANTERIOR')
    fake('scrot', 'exit 1')
    expect(drive('screenshot.captureExcluding', [], 0.8, 100, 100)).toEqual({ base64: '', width: 0, height: 0 })
  })
})
