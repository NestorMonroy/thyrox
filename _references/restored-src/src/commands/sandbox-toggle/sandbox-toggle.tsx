// ══════════════════════════════════════════════════════════════════
// restored-src/src/commands/sandbox-toggle/sandbox-toggle.tsx
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 10
// Mencionado en: part5/ch18b.md
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch18b.md · líneas 14-17 ───
if (!SandboxManager.isSupportedPlatform()) {
  const errorMessage = platform === 'wsl'
    ? 'Error: Sandboxing requires WSL2. WSL1 is not supported.'
    : 'Error: Sandboxing is currently only supported on macOS, Linux, and WSL2.';

// ─── ausente: líneas 18-32 (15 líneas sin fragmento en el corpus) ───

// ─── part5/ch18b.md · líneas 33-37 ───
if (SandboxManager.areSandboxSettingsLockedByPolicy()) {
  const message = color('error', themeName)(
    'Error: Sandbox settings are overridden by a higher-priority configuration and cannot be changed locally.'
  );
  onDone(message);
}
