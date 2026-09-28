#!/usr/bin/env bash
# Anulaciones de F7h-3a: se retira cada mitad de juicio de las rutas del inspector.
set -u
T=/home/user/thyrox; cd "$T/src/packages/mitm"
F=src/api/routes/inspector.ts
run() { bun test __tests__/api/inspectorRoutes.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
annul() { local f=$1; cp "$f" "$f.orig"; OLD="$2" NEW="$3" bash "$T/bin/replace_literal" "$f" >/dev/null && run; mv "$f.orig" "$f"; }
echo "== 1: host propio sin validar el nombre"; annul $F "  host: z.string().regex(HOSTNAME, 'host must be a valid hostname')," "  host: z.string().min(1),"
echo "== 2: repetir con la autorización enmascarada"; annul $F "        if (auth && !auth.includes('***')) headers.authorization = auth" "        if (auth) headers.authorization = auth"
echo "== 3: repetir sin la marca de origen"; annul $F "          'x-thyrox-source': 'inspector-replay'," ""
echo "== 4: repetición que falla sin 502"; annul $F "          return errorResponse({ status: 502, message: sanitizeErrorMessage(String(err)) || 'Replay failed' })" "          throw err"
echo "== 5: HAR de sesión con filas sin validar"; annul $F "        const requests = snapshotSession(db, params.id)" "        const requests = getSessionRequests(db, params.id).map(r => parsedPayload(r.payload)) as never[]"
echo "== 6: nombre del HAR sin sanear"; annul $F ".replace(/[^a-z0-9_-]/gi, '_')" ""
echo "== 7: renombrar sin nombre"; annul $F "          if (!body.data.name) return errorResponse({ status: 400, message: 'name is required for rename action' })
" ""
echo "== 8: sesión sin cuerpo como JSON malformado"; annul $F "parseOptionalJsonBody(request, InspectorSessionStartSchema)" "parseJsonBody(request, InspectorSessionStartSchema)"
echo "== 9: host sin DNS al añadir"; annul $F "          await deps.dns.add([host], password)" ""
echo "== 10: DNS que falla al añadir sin conservar el host"; annul $F "        addCustomHost(db, host, kind, label ?? undefined)
        const password" "        const password"
echo "== 11: borrar host sin aviso cuando falta la contraseña"; annul $F "        if (!password) return noContent(NO_DNS_PASSWORD_WARNING)" "        if (!password) return noContent()"
echo "== 12: sesión con requests aunque no exista"; annul $F "        if (!getSession(db, params.id)) return notFound('Session')
        const body = await parseJsonBody(request, InspectorSessionRequestAppendSchema)" "        const body = await parseJsonBody(request, InspectorSessionRequestAppendSchema)"
echo "== 13: consulta fuera del esquema aceptada"; annul $F "  if (!parsed.success) {
    return {" "  if (false as boolean) {
    return {"
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
