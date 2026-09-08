/**
 * Censo de SUSTITUTOS RANCIOS — un símbolo reimplementado localmente en un
 * `internal/pendingCrossPackageDeps.ts` cuyo hogar canónico YA lo exporta.
 *
 * POR QUÉ EXISTE. Un sustituto declara su motivo —«el paquete hermano aún
 * no exporta esto»— y ese motivo CADUCA sin avisar: el hermano se porta y
 * el sustituto se queda, con dos copias del mismo símbolo que pueden
 * divergir. No es hipotético: medido el 2026-09-08, cuatro sustitutos
 * seguían en pie con su hogar ya poblado, y uno de ellos DIVERGÍA del
 * canónico en dos puntos (`getClaudeConfigHomeDir` de `provider`: sin
 * normalizar a NFC, y tratando un override vacío como ausente).
 *
 * QUÉ MIDE: el nombre exportado por un `pendingCrossPackageDeps.ts` que
 * también exporta OTRO paquete del árbol.
 *
 * CIEGO A: el sustituto cuyo símbolo se llama distinto del canónico —el
 * emparejamiento es por nombre—; al que reimplementa algo que sigue
 * ausente de verdad; y a si las dos implementaciones COINCIDEN, que es
 * juicio de contenido y no de nombre. La salida es una lista de
 * CANDIDATOS a triar, no un veredicto.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const EXPORT_PATTERN =
  /^export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+(\w+)/gm

export type Substitute = {
  /** Paquete que lo reimplementa. */
  consumer: string
  symbol: string
  /** Paquetes cuyo árbol ya exporta ese nombre. */
  homes: string[]
}

function exportedNames(file: string): Set<string> {
  const names = new Set<string>()
  for (const match of readFileSync(file, 'utf8').matchAll(EXPORT_PATTERN)) {
    names.add(match[1]!)
  }
  return names
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(path, out)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(path)
    }
  }
  return out
}

/**
 * Recorre los paquetes de `packagesDir` y devuelve los sustitutos cuyo
 * nombre ya exporta otro paquete.
 */
export function findStaleSubstitutes(packagesDir: string): Substitute[] {
  const packages = readdirSync(packagesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'node_modules')
    .map(e => e.name)

  // Índice nombre → paquetes que lo exportan, EXCLUYENDO los propios
  // sustitutos: si dos paquetes se sustituyen mutuamente, ninguno es hogar.
  const homesByName = new Map<string, Set<string>>()
  for (const pkg of packages) {
    for (const file of sourceFiles(join(packagesDir, pkg))) {
      if (file.includes('pendingCrossPackageDeps')) continue
      for (const name of exportedNames(file)) {
        if (!homesByName.has(name)) homesByName.set(name, new Set())
        homesByName.get(name)!.add(pkg)
      }
    }
  }

  const stale: Substitute[] = []
  for (const pkg of packages) {
    for (const candidate of [
      join(packagesDir, pkg, 'src/internal/pendingCrossPackageDeps.ts'),
      join(packagesDir, pkg, 'internal/pendingCrossPackageDeps.ts'),
    ]) {
      if (!existsSync(candidate)) continue
      for (const symbol of exportedNames(candidate)) {
        // Un paquete no es hogar de sí mismo: el símbolo puede existir en
        // su propio árbol por otra razón.
        const homes = [...(homesByName.get(symbol) ?? [])].filter(h => h !== pkg)
        if (homes.length > 0) stale.push({ consumer: pkg, symbol, homes })
      }
    }
  }
  return stale.sort((a, b) =>
    a.consumer.localeCompare(b.consumer) || a.symbol.localeCompare(b.symbol),
  )
}
