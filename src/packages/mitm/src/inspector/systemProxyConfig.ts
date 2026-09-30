/**
 * Activa y revierte el proxy del sistema.
 *
 * macOS:    `networksetup -setwebproxy / -setsecurewebproxy`
 * Linux:    `gsettings set org.gnome.system.proxy.<esquema> host/port` y el modo
 * Windows:  `netsh winhttp set proxy <host:puerto>`
 *
 * Cada comando se lanza con `execFile` y un arreglo de argumentos, nunca con
 * una cadena de shell, para que ningún valor se interprete como sintaxis.
 *
 * El `previousState` que se devuelve es serializable a JSON: quien llama puede
 * guardarlo y pasarlo a `revert()` más tarde, también tras reiniciar el
 * proceso.
 *
 * Porte de `omniroute: src/mitm/inspector/systemProxyConfig.ts` (MIT).
 */

import { execFile, type ExecFileOptions } from "node:child_process";
import os from "node:os";
import { sanitizeErrorMessage } from "@thyrox/provider/sanitize/errorSanitization";

export type Platform = "linux" | "macos" | "windows";

export interface MacOsPreviousState {
  platform: "macos";
  service: string;
  http: { enabled: boolean; host: string; port: string };
  https: { enabled: boolean; host: string; port: string };
}

export interface LinuxPreviousState {
  platform: "linux";
  gnomeMode: string;
  httpHost: string;
  httpPort: string;
  httpsHost: string;
  httpsPort: string;
}

export interface WindowsPreviousState {
  platform: "windows";
  netshOutput: string;
}

export type PreviousState = MacOsPreviousState | LinuxPreviousState | WindowsPreviousState;

export interface ApplyResult {
  platform: Platform;
  previousState: PreviousState;
}

// Punto de inyección para las pruebas. Por defecto envuelve el `execFile` de
// node:child_process, así que cada llamada pasa sus argumentos en un arreglo.
export type ExecFileFn = (
  file: string,
  args: string[],
  options?: ExecFileOptions
) => Promise<{ stdout: string; stderr: string }>;

let execImpl: ExecFileFn = defaultExec;

function defaultExec(
  file: string,
  args: string[],
  options: ExecFileOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, ...options }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
      });
    });
  });
}

/** Sustituye el ejecutor de `execFile` (pruebas); devuelve el `restore()` que lo repone. */
export function __setExec(fn: ExecFileFn): () => void {
  const prev = execImpl;
  execImpl = fn;
  return () => {
    execImpl = prev;
  };
}

function detectPlatform(): Platform {
  const p = os.platform();
  if (p === "darwin") return "macos";
  if (p === "win32") return "windows";
  return "linux";
}

// ────────────────────────────────────────────────────────────────────────────
// macOS: networksetup
// ────────────────────────────────────────────────────────────────────────────

const MAC_DEFAULT_SERVICE = "Wi-Fi";

interface NetworksetupRead {
  enabled: boolean;
  host: string;
  port: string;
}

function parseNetworksetupGet(output: string): NetworksetupRead {
  // Salida de ejemplo:
  //   Enabled: Yes
  //   Server: 192.168.1.1
  //   Port: 3128
  //   Authenticated Proxy Enabled: 0
  const lines = output.split(/\r?\n/);
  let enabled = false;
  let host = "";
  let port = "";
  for (const line of lines) {
    const m = line.match(/^(\S[^:]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    if (key === "enabled") enabled = /yes/i.test(val);
    else if (key === "server") host = val;
    else if (key === "port") port = val;
  }
  return { enabled, host, port };
}

async function macosApply(port: number): Promise<MacOsPreviousState> {
  const service = MAC_DEFAULT_SERVICE;
  const httpGet = await execImpl("networksetup", ["-getwebproxy", service]);
  const httpsGet = await execImpl("networksetup", ["-getsecurewebproxy", service]);
  const previousState: MacOsPreviousState = {
    platform: "macos",
    service,
    http: parseNetworksetupGet(httpGet.stdout),
    https: parseNetworksetupGet(httpsGet.stdout),
  };

  await execImpl("networksetup", ["-setwebproxy", service, "127.0.0.1", String(port)]);
  await execImpl("networksetup", ["-setsecurewebproxy", service, "127.0.0.1", String(port)]);
  return previousState;
}

async function macosRevert(state: MacOsPreviousState): Promise<void> {
  const service = state.service;
  if (state.http.enabled && state.http.host && state.http.port) {
    await execImpl("networksetup", ["-setwebproxy", service, state.http.host, state.http.port]);
  } else {
    await execImpl("networksetup", ["-setwebproxystate", service, "off"]);
  }
  if (state.https.enabled && state.https.host && state.https.port) {
    await execImpl("networksetup", [
      "-setsecurewebproxy",
      service,
      state.https.host,
      state.https.port,
    ]);
  } else {
    await execImpl("networksetup", ["-setsecurewebproxystate", service, "off"]);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Linux: gsettings (GNOME); un sistema sin gsettings no se admite aquí.
// ────────────────────────────────────────────────────────────────────────────

async function readGsetting(key: string): Promise<string> {
  try {
    const { stdout } = await execImpl("gsettings", ["get", "org.gnome.system.proxy", key]);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function readGsubsetting(scheme: string, key: string): Promise<string> {
  try {
    // Concatenación y no plantilla: el esquema es la constante "http" o "https".
    const { stdout } = await execImpl("gsettings", [
      "get",
      "org.gnome.system.proxy." + scheme,
      key,
    ]);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function linuxApply(port: number): Promise<LinuxPreviousState> {
  const previousState: LinuxPreviousState = {
    platform: "linux",
    gnomeMode: await readGsetting("mode"),
    httpHost: await readGsubsetting("http", "host"),
    httpPort: await readGsubsetting("http", "port"),
    httpsHost: await readGsubsetting("https", "host"),
    httpsPort: await readGsubsetting("https", "port"),
  };

  const portStr = String(port);
  await execImpl("gsettings", ["set", "org.gnome.system.proxy", "mode", "manual"]);
  await execImpl("gsettings", ["set", "org.gnome.system.proxy.http", "host", "127.0.0.1"]);
  await execImpl("gsettings", ["set", "org.gnome.system.proxy.http", "port", portStr]);
  await execImpl("gsettings", ["set", "org.gnome.system.proxy.https", "host", "127.0.0.1"]);
  await execImpl("gsettings", ["set", "org.gnome.system.proxy.https", "port", portStr]);
  return previousState;
}

async function linuxRevert(state: LinuxPreviousState): Promise<void> {
  const mode = state.gnomeMode || "'none'";
  await execImpl("gsettings", ["set", "org.gnome.system.proxy", "mode", mode]);
  if (state.httpHost) {
    await execImpl("gsettings", ["set", "org.gnome.system.proxy.http", "host", state.httpHost]);
  }
  if (state.httpPort) {
    await execImpl("gsettings", ["set", "org.gnome.system.proxy.http", "port", state.httpPort]);
  }
  if (state.httpsHost) {
    await execImpl("gsettings", ["set", "org.gnome.system.proxy.https", "host", state.httpsHost]);
  }
  if (state.httpsPort) {
    await execImpl("gsettings", ["set", "org.gnome.system.proxy.https", "port", state.httpsPort]);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Windows: netsh winhttp
// ────────────────────────────────────────────────────────────────────────────

async function windowsApply(port: number): Promise<WindowsPreviousState> {
  const showRes = await execImpl("netsh", ["winhttp", "show", "proxy"]);
  const previousState: WindowsPreviousState = {
    platform: "windows",
    netshOutput: showRes.stdout,
  };
  // Concatenación y no plantilla: el puerto ya llega validado como entero en 1..65535.
  const proxyArg = "127.0.0.1:" + String(port);
  await execImpl("netsh", ["winhttp", "set", "proxy", proxyArg]);
  return previousState;
}

async function windowsRevert(_state: WindowsPreviousState): Promise<void> {
  // netsh no tiene una restauración idempotente: lo seguro es "reset". El
  // estado previo se conserva para mostrar qué había, pero no se reaplica.
  await execImpl("netsh", ["winhttp", "reset", "proxy"]);
}

// ────────────────────────────────────────────────────────────────────────────
// Interfaz pública
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pone `127.0.0.1:<port>` como proxy HTTP/HTTPS del sistema y devuelve la
 * configuración anterior para poder revertirla. Si el comando falla lanza un
 * `Error` saneado, sin traza ni rutas.
 */
export async function apply(port: number): Promise<ApplyResult> {
  const platform = detectPlatform();
  try {
    let previousState: PreviousState;
    if (platform === "macos") previousState = await macosApply(port);
    else if (platform === "windows") previousState = await windowsApply(port);
    else previousState = await linuxApply(port);
    return { platform, previousState };
  } catch (err) {
    throw new Error(sanitizeErrorMessage(err) || "system proxy apply failed");
  }
}

/**
 * Restaura la configuración que `apply()` guardó. No hace nada si el
 * `previousState` no corresponde a una plataforma conocida.
 */
export async function revert(previousState: PreviousState | unknown): Promise<void> {
  if (!previousState || typeof previousState !== "object") return;
  const state = previousState as Record<string, unknown>;
  const platform = state.platform;
  try {
    if (platform === "macos") await macosRevert(state as unknown as MacOsPreviousState);
    else if (platform === "linux") await linuxRevert(state as unknown as LinuxPreviousState);
    else if (platform === "windows") await windowsRevert(state as unknown as WindowsPreviousState);
  } catch (err) {
    throw new Error(sanitizeErrorMessage(err) || "system proxy revert failed");
  }
}
