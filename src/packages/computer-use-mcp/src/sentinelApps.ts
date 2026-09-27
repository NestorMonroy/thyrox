/**
 * Bundle IDs that are escalations-in-disguise. The approval UI shows a warning
 * badge for these; they are NOT blocked. Power users may legitimately want the
 * model controlling a terminal.
 *
 * Imported by the renderer via the `./sentinelApps` subpath (package.json
 * `exports`), which keeps Next.js from reaching index.ts → mcpServer.ts →
 * @modelcontextprotocol/sdk (devDep, would fail module resolution). Keep
 * this file import-free so the subpath stays clean.
 */

// Las tablas y la decisión son las de 2.1.283 (`chunk-de3xpxbw.js`: `$Ge`,
// `VGe`, `KGe`, `Gzt`, `Qzt`, `zzt`, `Jzt`, `Zzt` y `LB`), leídas con
// `bin/binary`. Hasta entonces este archivo tenía 9 de los 17 ids de shell de
// macOS y ninguna entrada de Windows.

/** These apps can execute arbitrary shell commands (`$Ge`). */
const SHELL_ACCESS_BUNDLE_IDS = new Set([
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "com.microsoft.VSCode",
  "dev.warp.Warp-Stable",
  "com.github.wez.wezterm",
  "org.alacritty",
  "io.alacritty",
  "net.kovidgoyal.kitty",
  "co.zeit.hyper",
  "com.mitchellh.ghostty",
  "com.todesktop.230313mzl4w4u92",
  "com.vscodium",
  "com.exafunction.windsurf",
  "dev.zed.Zed",
  "org.tabby",
  "com.jetbrains.intellij",
  "com.jetbrains.pycharm",
]);

/** Finder in the allowlist ≈ browse + open-any-file (`VGe`). */
const FILESYSTEM_ACCESS_BUNDLE_IDS = new Set(["com.apple.finder"]);

const SYSTEM_SETTINGS_BUNDLE_IDS = new Set(["com.apple.systempreferences"]);

/** Windows: shell executables, compared by lower-cased file name (`Gzt`). */
const WINDOWS_SHELL_EXECUTABLES = new Set([
  "cmd.exe",
  "powershell.exe",
  "pwsh.exe",
  "wt.exe",
  "windowsterminal.exe",
  "code.exe",
  "cursor.exe",
  "vscodium.exe",
  "windsurf.exe",
  "zed.exe",
  "alacritty.exe",
  "wezterm-gui.exe",
  "warp.exe",
  "hyper.exe",
  "tabby.exe",
  "idea64.exe",
  "pycharm64.exe",
  "conemu.exe",
  "conemu64.exe",
]);

/** Windows: Store packages whose app id starts with these (`Qzt`). */
const WINDOWS_SHELL_PACKAGE_PREFIXES = [
  "Microsoft.WindowsTerminal_",
  "Microsoft.WindowsTerminalPreview_",
  "Microsoft.PowerShell_",
];

const WINDOWS_FILESYSTEM_EXECUTABLES = new Set(["explorer.exe"]);

const WINDOWS_SYSTEM_SETTINGS_EXECUTABLES = new Set(["systemsettings.exe"]);

const WINDOWS_SYSTEM_SETTINGS_PACKAGE_PREFIXES = ["windows.immersivecontrolpanel_"];

/** The union of the three macOS sets (`tKn`); Windows is decided by category. */
export const SENTINEL_BUNDLE_IDS: ReadonlySet<string> = new Set([
  ...SHELL_ACCESS_BUNDLE_IDS,
  ...FILESYSTEM_ACCESS_BUNDLE_IDS,
  ...SYSTEM_SETTINGS_BUNDLE_IDS,
]);

export type SentinelCategory = "shell" | "filesystem" | "system_settings";

/** El nombre del ejecutable en minúsculas, sin su ruta (`Vzt`). */
function executableName(bundleId: string): string {
  return bundleId.toLowerCase().split(/[\\/]/).pop() ?? "";
}

/** La categoría de una app, o null si no es centinela (`LB`). */
export function getSentinelCategory(bundleId: string): SentinelCategory | null {
  if (SHELL_ACCESS_BUNDLE_IDS.has(bundleId)) return "shell";
  if (FILESYSTEM_ACCESS_BUNDLE_IDS.has(bundleId)) return "filesystem";
  if (SYSTEM_SETTINGS_BUNDLE_IDS.has(bundleId)) return "system_settings";
  if (WINDOWS_SHELL_PACKAGE_PREFIXES.some((prefix) => bundleId.startsWith(prefix))) return "shell";
  if (WINDOWS_SYSTEM_SETTINGS_PACKAGE_PREFIXES.some((prefix) => bundleId.startsWith(prefix))) {
    return "system_settings";
  }
  const executable = executableName(bundleId);
  if (WINDOWS_SHELL_EXECUTABLES.has(executable)) return "shell";
  if (WINDOWS_FILESYSTEM_EXECUTABLES.has(executable)) return "filesystem";
  if (WINDOWS_SYSTEM_SETTINGS_EXECUTABLES.has(executable)) return "system_settings";
  return null;
}
