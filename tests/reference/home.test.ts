/**
 * `src/packages/harness` queda VACIO: el paquete deja de existir (#81, #226).
 *
 * DE DONDE SALE EL DESTINO de su ultima unidad, y no se inventa. #265 midio
 * que `reference/triple.ts` NO tiene consumidor —sus cuatro simbolos
 * exportados dan cero fuera del propio paquete—, asi que su hogar no lo
 * decide un consumidor. Lo decide el PRECEDENTE, y el precedente esta
 * ejecutado: `src/workbench/manifest.ts` es un primitivo de la misma clase
 * —procedimiento de construccion, no producto ni estado— y vive en
 * `src/<dominio>/` a nivel de raiz, con su suite en `tests/<dominio>/`.
 * `triple.ts` toma la misma forma: `src/reference/triple.ts` +
 * `tests/reference/`.
 *
 * Las otras dos suites del paquete —`claims` y `branchIntegration`— ya no
 * miden nada que viva en el: sus imports apuntan a `src/coordination/` desde
 * hace tramos. Se quedaron atras cuando su sujeto se mudo, y viajan a
 * `tests/coordination/`, con su sujeto.
 *
 * MITAD ROJA: los cuatro casos fallan contra el arbol de hoy.
 *
 * CONTROL DE ANULACION, a medir tras la mudanza: se recrea
 * `src/packages/harness/package.json` y debe caer **1 de 4**, el caso 3. Los
 * casos 1, 2 y 4 sobreviven, y deben: miden donde vive cada modulo y que
 * declara el workspace, no si un directorio quedo en el disco.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { thyroxRoot } from '../../src/paths/reach.ts'

const ROOT = thyroxRoot()

describe('el paquete harness deja de existir', () => {
  test('1. la triple de referencia vive en src/reference, como el workbench', () => {
    expect(existsSync(join(ROOT, 'src', 'reference', 'triple.ts'))).toBe(true)
    // El precedente que fija la forma, no una preferencia: el mismo layout.
    expect(existsSync(join(ROOT, 'src', 'workbench', 'manifest.ts'))).toBe(true)
  })

  test('2. las dos suites huerfanas viajan con su sujeto a coordination', () => {
    for (const name of ['claims.test.ts', 'branchIntegration.test.ts']) {
      expect(existsSync(join(ROOT, 'tests', 'coordination', name))).toBe(true)
    }
    expect(existsSync(join(ROOT, 'src', 'coordination', 'claims.ts'))).toBe(true)
  })

  test('3. el directorio del paquete ya no esta', () => {
    expect(existsSync(join(ROOT, 'src', 'packages', 'harness'))).toBe(false)
  })

  test('4. el workspace ya no lo declara, y nadie lo cita', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'src', 'packages', 'package.json'), 'utf-8'))
    expect(manifest.workspaces ?? []).not.toContain('harness')
    // Metrica: especificadores de modulo que nombren el paquete, en todo `.ts`
    // de `src/` y `tests/`.
    // Ciega a: la prosa que lo mencione —este archivo lo nombra— y a una cita
    // desde fuera de este clon.
    //
    // `grep` sale 1 cuando NO encuentra nada, que es justo el estado deseado,
    // y `execFileSync` lo lanza. Tragarse la excepcion entera haria que un
    // error REAL del comando —salida 2: ruta inexistente, patron invalido— se
    // leyera como «limpio»: el control dejaria de poder fallar por la razon
    // correcta. Por eso se discrimina por codigo de salida.
    const { spawnSync } = require('node:child_process') as typeof import('node:child_process')
    const r = spawnSync('grep', [
      '-rn', '--include=*.ts', '-E',
      "(from|import)[[:space:]]*\\(?[[:space:]]*['\"][^'\"]*@thyrox/harness",
      join(ROOT, 'src'), join(ROOT, 'tests'),
    ], { encoding: 'utf-8' })
    expect(r.status === 0 || r.status === 1).toBe(true)   // 2 = el grep fallo
    expect((r.stdout ?? '').trim()).toBe('')
  })
})
