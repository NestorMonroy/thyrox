#!/usr/bin/env bash
# Anulaciones de F7h-0: se retira cada mitad de juicio de la guarda y del enrutador.
set -u
T=/home/user/thyrox; cd "$T/src/packages/mitm"
L=src/api/locality.ts; R=src/api/router.ts
run() { bun test __tests__/api 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'; }
annul() { local f=$1; cp "$f" "$f.orig"; OLD="$2" NEW="$3" bash "$T/bin/replace_literal" "$f" >/dev/null && run; mv "$f.orig" "$f"; }
echo "== 1: sin mirar las cabeceras de reenvío"; annul $L "  if (hasForwardingHeaders(request.headers)) return false
" ""
echo "== 2: sin mirar el Host"; annul $L "  return isLoopbackHost(request.headers.get('host'))" "  return true"
echo "== 3: un par desconocido cuenta como local"; annul $L "  if (!isLoopbackHost(peerAddress)) return false" "  if (peerAddress !== null && !isLoopbackHost(peerAddress)) return false"
echo "== 4: sin capturar el error de la ruta"; annul $R "      try {
        return await route.handler({ request, url, params })
      } catch (err) {
        return errorFromUnknown(err)
      }" "      return await route.handler({ request, url, params })"
echo "== 5: sin distinguir 405"; annul $R "    if (allowed.length > 0) {" "    if (false) {"
echo "== 6: parámetros sin decodificar"; annul $R "      params[segment.slice(1)] = decodeURIComponent(got[i]!)" "      params[segment.slice(1)] = got[i]!"
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src/api; run
