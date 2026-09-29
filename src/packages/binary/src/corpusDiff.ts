/**
 * Diferencia entre dos `MANIFEST.tsv` de corpus, por ruta y por sha256.
 *
 * Compara EXTRACCIONES ya escritas, no bytes en disco: las dos entradas de
 * cada lado salen de parsear el texto del manifiesto, nunca de releer los
 * archivos que describe. Un archivo con la misma ruta y el mismo sha256 en
 * las dos builds es `unchanged`; con la misma ruta y otro sha256, `changed`.
 */

export type ManifestEntry = { path: string; bytes: number; type: string; sha256: string }

export type ManifestChange = { path: string; before: ManifestEntry; after: ManifestEntry }

export type ManifestDiff = {
  added: ManifestEntry[]
  removed: ManifestEntry[]
  changed: ManifestChange[]
  unchanged: ManifestEntry[]
}

/** Parsea un `MANIFEST.tsv` (cabecera `archivo\tbytes\ttipo\tsha256`), sin releer disco. */
export function parseManifest(text: string): ManifestEntry[] {
  const [, ...rows] = text.trim() ? text.trim().split('\n') : []
  return rows.map(row => {
    const [path, bytes, type, sha256] = row.split('\t')
    return { path: path!, bytes: Number(bytes), type: type!, sha256: sha256! }
  })
}

/**
 * Compara `baseText` contra `nextText` por ruta. Una ruta que solo esta en
 * `nextText` es `added`; que solo esta en `baseText`, `removed`; presente en
 * las dos, `changed` o `unchanged` segun coincida el sha256.
 */
export function diffManifests(baseText: string, nextText: string): ManifestDiff {
  const base = new Map(parseManifest(baseText).map(e => [e.path, e]))
  const next = new Map(parseManifest(nextText).map(e => [e.path, e]))

  const added: ManifestEntry[] = []
  const changed: ManifestChange[] = []
  const unchanged: ManifestEntry[] = []
  for (const [path, after] of next) {
    const before = base.get(path)
    if (!before) { added.push(after); continue }
    if (before.sha256 === after.sha256) unchanged.push(after)
    else changed.push({ path, before, after })
  }

  const removed: ManifestEntry[] = []
  for (const [path, before] of base) if (!next.has(path)) removed.push(before)

  return { added, removed, changed, unchanged }
}
