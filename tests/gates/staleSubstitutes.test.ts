/**
 * Censo de sustitutos rancios (`src/gates/staleSubstitutes.ts`).
 *
 * QUÉ MIDE EL INSTRUMENTO, y por qué hacía falta. Cuatro veces en la misma
 * jornada un porte se topó con un sustituto local cuyo motivo declarado
 * —«el paquete hermano aún no exporta esto»— había caducado sin que nadie
 * lo notara. El motivo caduca EN SILENCIO: el hermano se porta, el
 * sustituto se queda, y quedan dos copias del mismo símbolo que pueden
 * divergir. Una ya divergía.
 *
 * Los casos corren sobre un árbol de paquetes SINTÉTICO, no sobre el real:
 * medir contra el árbol vivo ataría las aserciones al estado del porte de
 * hoy, y el control diría cosas distintas cada semana sin que el
 * instrumento cambie.
 *
 * MITAD ROJA: los casos fallan porque el módulo no existe.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Levanta un árbol de paquetes de mentira con el contenido declarado. */
function arbolDePaquetes(archivos: Record<string, string>): string {
  const raiz = mkdtempSync(join(tmpdir(), 'stale-'))
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const destino = join(raiz, ruta)
    mkdirSync(join(destino, '..'), { recursive: true })
    writeFileSync(destino, contenido)
  }
  return raiz
}

describe('findStaleSubstitutes', () => {
  test('1. señala el sustituto cuyo hogar YA exporta el símbolo', async () => {
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'consumidor/src/internal/pendingCrossPackageDeps.ts':
        'export function getConfigHome(): string { return "" }\n',
      'hogar/src/utils.ts': 'export function getConfigHome(): string { return "/x" }\n',
    })
    const rancios = findStaleSubstitutes(raiz)
    expect(rancios).toEqual([
      { consumer: 'consumidor', symbol: 'getConfigHome', homes: ['hogar'] },
    ])
  })

  test('2. NO señala el sustituto que sigue sin hogar', async () => {
    // Es la mitad que hace útil al censo: si marcara todo, no distinguiría
    // el sustituto caduco del que sigue haciendo falta, y su lista sería
    // el inventario de sustitutos en vez de los rancios.
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'consumidor/src/internal/pendingCrossPackageDeps.ts':
        'export function loQueNadieExporta(): void {}\n',
      'hogar/src/utils.ts': 'export function otraCosa(): void {}\n',
    })
    expect(findStaleSubstitutes(raiz)).toEqual([])
  })

  test('3. dos sustitutos del MISMO nombre no se declaran hogar entre sí', async () => {
    // Sin esta exclusión, dos paquetes que se sustituyen mutuamente se
    // marcarían como rancios el uno al otro y el censo mandaría retirar
    // las dos copias, dejando el símbolo sin ninguna.
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'a/src/internal/pendingCrossPackageDeps.ts': 'export function comun(): void {}\n',
      'b/src/internal/pendingCrossPackageDeps.ts': 'export function comun(): void {}\n',
    })
    expect(findStaleSubstitutes(raiz)).toEqual([])
  })

  test('4. un paquete no es hogar de SÍ MISMO', async () => {
    // El símbolo puede existir en el propio árbol del consumidor por otra
    // razón —un re-export, un homónimo local—. Marcarlo diría «retira el
    // sustituto» señalando al propio paquete que lo necesita.
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'solo/src/internal/pendingCrossPackageDeps.ts': 'export function x(): void {}\n',
      'solo/src/otro.ts': 'export function x(): void {}\n',
    })
    expect(findStaleSubstitutes(raiz)).toEqual([])
  })

  test('5. los tests NO cuentan como hogar', async () => {
    // Un símbolo que sólo exporta un archivo de prueba no es una API que
    // nadie pueda importar. Contarlo mandaría retirar un sustituto
    // apuntando a un hogar que no existe en producción.
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'consumidor/src/internal/pendingCrossPackageDeps.ts': 'export function y(): void {}\n',
      'hogar/src/__tests__/algo.ts': 'export function y(): void {}\n',
      'hogar/src/otro.test.ts': 'export function y(): void {}\n',
    })
    expect(findStaleSubstitutes(raiz)).toEqual([])
  })

  test('6. reconoce las cinco formas de export, y varios hogares', async () => {
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'consumidor/src/internal/pendingCrossPackageDeps.ts': [
        'export function unaFuncion(): void {}',
        'export const unaConstante = 1',
        'export class UnaClase {}',
        'export type UnTipo = string',
        'export interface UnaInterfaz { a: number }',
        'export async function unaAsincrona(): Promise<void> {}',
      ].join('\n'),
      'hogarUno/src/a.ts': [
        'export function unaFuncion(): void {}',
        'export const unaConstante = 2',
        'export class UnaClase {}',
      ].join('\n'),
      'hogarDos/src/b.ts': [
        'export type UnTipo = string',
        'export interface UnaInterfaz { a: number }',
        'export async function unaAsincrona(): Promise<void> {}',
        'export function unaFuncion(): void {}',
      ].join('\n'),
    })
    const rancios = findStaleSubstitutes(raiz)
    expect(rancios.map(r => r.symbol).sort()).toEqual([
      'UnTipo', 'UnaClase', 'UnaInterfaz',
      'unaAsincrona', 'unaConstante', 'unaFuncion',
    ])
    expect(rancios.find(r => r.symbol === 'unaFuncion')?.homes.sort())
      .toEqual(['hogarDos', 'hogarUno'])
  })

  test('7. `node_modules` no es un hogar', async () => {
    // Un symlink de workspace pondría el árbol entero del hermano bajo
    // `node_modules`, y cada símbolo aparecería dos veces con el paquete
    // equivocado como hogar.
    const { findStaleSubstitutes } = await import('../../src/gates/staleSubstitutes.ts')
    const raiz = arbolDePaquetes({
      'consumidor/src/internal/pendingCrossPackageDeps.ts': 'export function z(): void {}\n',
      'consumidor/node_modules/paquete/src/z.ts': 'export function z(): void {}\n',
    })
    expect(findStaleSubstitutes(raiz)).toEqual([])
  })
})
