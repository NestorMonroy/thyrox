#!/usr/bin/env bash
# Anulaciones de F7h-3b: destino de la ingesta, modos de captura, ingesta y canal en vivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
C=src/api/routes/inspector; S=src/api/server.ts; L=src/api/liveStream.ts; M=src/server/mitmServer.ts
run() { bun test __tests__/api __tests__/server/mitmServer.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: ingesta al enrutador"; annul "$M" "postIngestEntry(config.ingestBaseUrl," "postIngestEntry(config.routerBaseUrl,"
echo "== 3: ingesta sin token"; annul "$C" "        if (!tokenMatches(token, deps.ingestToken())) {" "        if (false as boolean) {"
echo "== 4: ingesta sin sanear cabeceras"; annul "$C" "    requestHeaders: sanitizeHeaders(data.requestHeaders)," "    requestHeaders: data.requestHeaders,"
echo "== 5: ingesta sin enmascarar el cuerpo"; annul "$C" "    requestBody: data.requestBody != null ? maskSecret(data.requestBody) : null," "    requestBody: data.requestBody ?? null,"
echo "== 6: token corto aceptado"; annul "$C" "declared && declared.length >= MIN_INGEST_TOKEN_LENGTH ?" "declared ?"
echo "== 7: proxy HTTP arrancado dos veces"; annul "$C" "        if (current) return Response.json({ ok: true, running: true, port: current.port })
" ""
echo "== 8: parar sin olvidar el manejador"; annul "$C" "            deps.httpProxy.remember(null)
" ""
echo "== 9: puerto ocupado como 500"; annul "$C" "          if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err" "          throw err"
echo "== 10: revertir sin estado anterior"; annul "$C" "          if (previous) await systemProxy.revert(previous)" "          await systemProxy.revert(previous as never)"
echo "== 11: guarda sin su valor por defecto"; annul "$C" "body.data.guardMinutes ?? systemProxy.defaultGuardMinutes()" "body.data.guardMinutes ?? 0"
echo "== 12: canal sin guarda de loopback"; annul "$S" "    if (!isLocalRequest(request, peerAddress(request))) return localOnlyRejection()
" ""
echo "== 13: canal sin pedir la negociación"; annul "$S" "    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {" "    if (false as boolean) {"
echo "== 14: cerrar sin soltar la suscripción"; annul "$L" "      ws.data.unsubscribe?.()
" ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
