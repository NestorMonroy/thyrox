#!/usr/bin/env bash
# Anulaciones de F7h-2: se retira cada mitad de juicio de las rutas privilegiadas.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F="src/api/routes/agentBridge src/api/routes/sudoRequest.ts"; H=src/api/http.ts
run() { bun test __tests__/api/agentBridgePrivilegedRoutes.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: POST /cert sin compuerta de sudo"; annul "$F" "        return sudo.missing ? missingPassword() : trustActiveCert(deps, sudo)
      },
    },
    {
      method: 'DELETE'," "        return trustActiveCert(deps, sudo)
      },
    },
    {
      method: 'DELETE',"
echo "== 2: recordar la contraseña también en Windows"; annul "$F" "      if (deps.platform !== 'win32' && given) deps.sudo.remember(given)" "      if (given) deps.sudo.remember(given)"
echo "== 3: recordar antes de saber si instaló"; annul "$F" "  const result = await deps.cert.install(sudo.password, certPath, mode)
  if (result.installed) {
    sudo.rememberGiven()" "  sudo.rememberGiven()
  const result = await deps.cert.install(sudo.password, certPath, mode)
  if (result.installed) {"
echo "== 4: reiniciar para aunque no corra"; annul "$F" "      if ((await deps.server.status()).running) await deps.server.stop(sudo.password)" "      await deps.server.stop(sudo.password)"
echo "== 5: reiniciar sin volver a guardar la contraseña"; annul "$F" "      if (sudo.password) deps.sudo.remember(sudo.password)
" ""
echo "== 6: regenerar sin forzar"; annul "$F" "certPath: (await deps.cert.generate(true)).cert" "certPath: (await deps.cert.generate(false)).cert"
echo "== 7: confiar sin comprobar que el certificado existe"; annul "$F" "  if (!deps.cert.exists(certPath)) {
    return errorResponse({ status: 404, message: 'Certificate not found. Generate one first.' })
  }
" ""
echo "== 8: cancelación como fallo de entorno"; annul "$F" "  if (result.reason === 'canceled') return errorResponse({ status: 409, message: 'User canceled authorization' })
" ""
echo "== 9: DELETE /cert sin la salida idempotente"; annul "$F" "        if (!deps.cert.exists(certPath)) return Response.json({ ok: true, trusted: false })
" ""
echo "== 10: DNS de un agente desconocido"; annul "$F" "        if (!isAgentId(params.id)) return errorResponse({ status: 404, message: \`Unknown agent: \${params.id}\` })
        const sudo = sudoFor(deps, body.data.sudoPassword)
        if (sudo.missing) return missingPassword()
        const { enabled }" "        if (!isAgentId(params.id)) return errorResponse({ status: 404, message: 'x' })
        const sudo = sudoFor(deps, body.data.sudoPassword)
        if (sudo.missing) return missingPassword()
        const { enabled }"
echo "== 11: reinicio sin vaciar la caché DNS de Windows"; annul "$F" "        deps.dns.flushWindowsCache()
" ""
echo "== 12: reinicio sin copiar al alias"; annul "$F" "        syncAgentBridgeMappingsToMitmAlias(db, agentId)
" ""
echo "== 13: reinicio sin verificar el archivo de hosts"; annul "$F" "          verified: !deps.dns.configuredFor(agentId)," "          verified: true,"
echo "== 15: diagnóstico sondea con el servidor parado"; annul "$F" "          serverReachable: status.running ? await deps.probeTcp(port) : false," "          serverReachable: await deps.probeTcp(port),"
echo "== 16: diagnóstico sin el agregado de DNS"; annul "$F" "dnsConfigured: agentId ? status.dnsConfigured : anyAgentDnsConfigured(db, deps.dns.configuredFor)," "dnsConfigured: status.dnsConfigured,"
echo "== 17: CA del upstream sin comprobar el archivo"; annul "$F" "        if (!fs.existsSync(caPath)) {
          return errorResponse({ status: 400, message: \`Upstream CA file not found: \${caPath}\` })
        }
        deps.upstreamCa.store(caPath)" "        deps.upstreamCa.store(caPath)"
echo "== 18: CA del upstream que no activa sin 400"; annul "$F" "        try {
          deps.upstreamCa.configure(caPath)
        } catch (err) {
          return errorResponse({ status: 400, message: sanitizeErrorMessage(String(err)) })
        }" "        deps.upstreamCa.configure(caPath)"
echo "== 19: prueba de CA sin el marcador PEM"; annul "$F" "  if (!pem.includes('-----BEGIN CERTIFICATE-----')) {" "  if (false) {"
echo "== 20: TPROXY inválido sin su tipo"; annul "$F" "status: 400, type: 'invalid_request', message: 'Invalid TPROXY capture config'" "status: 422, message: 'Invalid TPROXY capture config'"
echo "== 21: cuerpo vacío como JSON malformado"; annul "$H" "  if (text.trim() === '') return validateBody({}, schema)
" ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
