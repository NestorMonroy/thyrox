// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/plugins/pluginOptionsStorage.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 12
// Mencionado en: part6/ch22b.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch22b.md · líneas 1-13 ───
// Storage splits by `sensitive`:
//   - `sensitive: true`  → secureStorage (keychain on macOS, .credentials.json elsewhere)
//   - everything else    → settings.json `pluginConfigs[pluginId].options`

// ─── ausente: líneas 14-55 (42 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 56-77 ───
export const loadPluginOptions = memoize(
  (pluginId: string): PluginOptionValues => {
    // ...
    // secureStorage wins on collision — schema determines destination so
    // collision shouldn't happen, but if a user hand-edits settings.json we
    // trust the more secure source.
    return { ...nonSensitive, ...sensitive }
  },
)
