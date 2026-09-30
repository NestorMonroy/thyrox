#!/usr/bin/env bash
# Anulaciones de clientHello, httpResponse, tlsCapture, captureMode y captureManager.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
M="$ROOT/src/packages/mitm"
run() { (cd "$M" && timeout 180 bun test __tests__/tproxy 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'); }
annul() {
  local file="$M/src/tproxy/$2"
  cp "$file" "$file.orig"
  OLD="$3" NEW="$4" bash "$ROOT/bin/replace_literal" "$file" >/dev/null || { echo "NO APLICÓ: $1"; mv "$file.orig" "$file"; return; }
  echo "== anulada: $1"; run
  mv "$file.orig" "$file"
}
echo "== base"; run
annul "la SNI no se lee" clientHello.ts "    if (type === SERVER_NAME_EXTENSION && body + 5 <= extensionsEnd" "    if (false && type === SERVER_NAME_EXTENSION && body + 5 <= extensionsEnd"
annul "sin decodificar chunked" httpResponse.ts "    body = decodeChunked(rest)" "    body = rest"
annul "el reenvío espera a que el socket conecte" tlsCapture.ts "    if (raw.connecting) await once(raw, 'connect')" ""
annul "sin destino por puerto de loopback" tlsCapture.ts "      if (typeof localPort === 'number') destByLoopbackPort.set(localPort, { ...dest, sni: servername })" ""
annul "reenvío crudo sin cabecera a la salida" captureMode.ts "      socket.write(formatProxyV1Header({ srcIp: '127.0.0.1', srcPort: socket.localPort ?? 0, dstIp: ip, dstPort: port }))
" ""
annul "sin retirar la CA si el puente falla" captureMode.ts "    await uninstallCa?.().catch(() => {})
" ""
annul "dos sesiones simultáneas" captureManager.ts "  if (active) throw new Error('TPROXY capture mode is already running')
" ""
echo "== restaurado"; run
git -C "$ROOT" diff --stat -- "$M/src/tproxy" | tail -1
