#!/usr/bin/env bash
# Anulaciones de F7e-2d: se retira cada mitad de juicio de la captura TPROXY
# de extremo a extremo, contra el kernel real y en un espacio de red propio.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F=src/tproxy
run() { timeout 90 bun test __tests__/tproxy/tproxyCaptureEndToEnd.test.ts __tests__/tproxy/tlsCapture.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin cerrar cuando el cliente lo pide"; annul "$F" "  closeAfterResponseIfAsked(req, res)
  const startedAt" "  const startedAt"
echo "== 2: la cabecera de cierre sin cerrar el socket"; annul "$F" "  res.once('finish', () => req.socket.end())
" ""
echo "== 3: la connection del upstream copiada al cliente"; annul "$F" " && lk !== 'connection') safeHeaders[k] = v" ") safeHeaders[k] = v"
echo "== 4: la salida sin marca de exclusión"; annul "$F" "  if (cfg.bypassMark !== undefined) spec.push('-m', 'mark', '!', '--mark', String(cfg.bypassMark))
" ""
echo "== 5: sin descifrar: el cliente recibe el certificado equivocado"; annul "$F" "    const terminate: Terminate | undefined = engine ? (client, dest, initial) => engine!.terminate(client, dest, initial) : undefined" "    const terminate: Terminate | undefined = undefined"
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
