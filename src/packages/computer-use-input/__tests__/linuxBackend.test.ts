/**
 * Contrato de `@ant/computer-use-input` en Linux: teclado y ratón por
 * `xdotool`.
 *
 * Medido con `bin/binary` sobre 2.1.283 (banco
 * `napi-contracts-20260927T073211`): la build de Linux de referencia no tiene
 * backend de entrada —0 declaraciones con `xdotool` o `getmouselocation`; de
 * computer use sólo conserva su familia de render— y su entrada nativa
 * (enigo) es de macOS. El backend de Linux es propio del porte, así que su
 * contrato es el de la CLI que invoca: qué argumentos recibe `xdotool` y
 * cómo se lee lo que responde.
 *
 * `xdotool` no está en esta máquina ni en CI, y moverle el ratón a quien
 * corre la suite no es una prueba. Cada operación corre en un proceso propio
 * (`fixtures/drive.ts`) cuyo PATH lleva delante un `xdotool` falso que anota
 * su argv y responde con la forma del real: `Bun.spawnSync` resuelve contra el
 * PATH con que nació el proceso, así que mutarlo aquí no alcanzaría.
 *
 * Restricción técnica declarada: el backend sólo se carga en Linux; en otra
 * plataforma estos casos se saltan con esa razón.
 *
 * Control de anulación, medido mutando `backends/linux.ts` y restaurándolo:
 * sin redondeo cae el 2; sin leer `getmouselocation`, el 3; el botón derecho
 * como medio, el 4; la rueda en cero invocando, el 5; `esc` sin traducir o la
 * combinación partida en argumentos, el 6; sin retardo al escribir, el 7; sin
 * leer `/proc/<pid>/comm`, el 8; sin la guarda de ventana, el 9.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as input from '../src/index.ts'

const onLinux = process.platform === 'linux'
const bin = mkdtempSync(join(tmpdir(), 'xdotool-'))
const calls = join(bin, 'calls')
const DRIVER = join(import.meta.dir, 'fixtures', 'drive.ts')
afterAll(() => rmSync(bin, { recursive: true, force: true }))

/** Corre una operación del backend con el `xdotool` falso delante en el PATH. */
function drive(operation: string, ...args: unknown[]): unknown {
  const child = Bun.spawnSync(['bun', DRIVER, operation, JSON.stringify(args)], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  })
  if (child.exitCode !== 0) throw new Error(child.stderr.toString())
  return JSON.parse(child.stdout.toString())
}

/** Un `xdotool` que anota cada invocación (argumentos separados por TAB). */
function fakeXdotool(replies: Record<string, string>): void {
  const cases = Object.entries(replies)
    .map(([sub, out]) => `  ${sub}) printf '%s' '${out}' ;;`).join('\n')
  writeFileSync(join(bin, 'xdotool'),
    `#!/bin/sh\n(IFS='\t'; printf '%s\\n' "$*") >> '${calls}'\ncase "$1" in\n${cases}\nesac\n`)
  chmodSync(join(bin, 'xdotool'), 0o755)
}

function recorded(): string[][] {
  return existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(l => l.split('\t')) : []
}

beforeEach(() => {
  rmSync(calls, { force: true })
  fakeXdotool({})
})

describe.skipIf(!onLinux)('computer-use-input — Linux por xdotool', () => {
  test('1. el backend carga y la superficie está completa', () => {
    expect(input.isSupported).toBe(true)
    for (const name of ['moveMouse', 'key', 'keys', 'mouseLocation', 'mouseButton', 'mouseScroll', 'typeText', 'getFrontmostAppInfo'] as const) {
      expect([name, typeof input[name]]).toEqual([name, 'function'])
    }
  })

  test('2. mover el ratón redondea y espera a que llegue (--sync)', () => {
    drive('moveMouse', 10.4, 19.6, true)
    expect(recorded()).toEqual([['mousemove', '--sync', '10', '20']])
  })

  test('3. la posición se lee de la respuesta de getmouselocation', () => {
    fakeXdotool({ getmouselocation: 'x:123 y:456 screen:0 window:12345678' })
    expect(drive('mouseLocation')).toEqual({ x: 123, y: 456 })
    fakeXdotool({ getmouselocation: 'sin pantalla' })
    expect(drive('mouseLocation')).toEqual({ x: 0, y: 0 })
  })

  test('4. los botones: clic con repetición, pulsar y soltar, con la numeración de X', () => {
    drive('mouseButton', 'right', 'click', 2)
    drive('mouseButton', 'left', 'click')
    drive('mouseButton', 'middle', 'press')
    drive('mouseButton', 'left', 'release')
    expect(recorded()).toEqual([
      ['click', '--repeat', '2', '3'],
      ['click', '--repeat', '1', '1'],
      ['mousedown', '2'],
      ['mouseup', '1'],
    ])
  })

  test('5. la rueda: signo a botón (4/5 vertical, 6/7 horizontal) y cero no invoca nada', () => {
    drive('mouseScroll', -3, 'vertical')
    drive('mouseScroll', 2.4, 'horizontal')
    drive('mouseScroll', 0, 'vertical')
    expect(recorded()).toEqual([
      ['click', '--repeat', '3', '4'],
      ['click', '--repeat', '2', '7'],
    ])
  })

  test('6. las teclas se traducen a keysyms de X, y una combinación va en una sola invocación', () => {
    drive('key', 'Return', 'press')
    drive('key', 'esc', 'release')
    drive('keys', ['ctrl', 'shift', 't'])
    drive('keys', ['command', 'pagedown'])
    drive('keys', ['shift', 'alt'])
    expect(recorded()).toEqual([
      ['keydown', 'Return'],
      ['keyup', 'Escape'],
      ['key', 'ctrl+shift+t'],
      ['key', 'super+Next'],
    ])
  })

  test('7. escribir texto pasa el texto como un solo argumento, con retardo', () => {
    drive('typeText', 'hola mundo; $(no se expande)')
    expect(recorded()).toEqual([['type', '--delay', '12', 'hola mundo; $(no se expande)']])
  })

  test('8. la app al frente sale de la ventana activa y /proc de su proceso', () => {
    fakeXdotool({ getactivewindow: '4242', getwindowpid: String(process.pid) })
    const info = drive('getFrontmostAppInfo') as { bundleId: string; appName: string } | null
    const exe = Bun.spawnSync(['readlink', '-f', `/proc/${process.pid}/exe`]).stdout.toString().trim()
    expect(info?.bundleId).toBe(exe)
    expect(info?.appName).toBe(readFileSync(`/proc/${process.pid}/comm`, 'utf8').trim())
    expect(recorded()).toEqual([['getactivewindow'], ['getwindowpid', '4242']])
  })

  test('9. sin ventana activa no hay app al frente', () => {
    expect(drive('getFrontmostAppInfo') as { bundleId: string; appName: string } | null).toBeNull()
    expect(recorded()).toEqual([['getactivewindow']])
  })
})
