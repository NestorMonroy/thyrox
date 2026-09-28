#!/usr/bin/env bash
# Anulaciones de F7h-4: ajustes del MITM y superficie de CLI de antigravity.
set -u
T=/home/user/thyrox; cd "$T/src/packages/mitm"
F=src/api/routes/mitmSettings.ts
run() { bun test __tests__/api/mitmSettingsRoutes.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
annul() { local f=$1; cp "$f" "$f.orig"; OLD="$2" NEW="$3" bash "$T/bin/replace_literal" "$f" >/dev/null && run; mv "$f.orig" "$f"; }
echo "== 1: cualquier puerto"; annul $F "        if (port !== undefined && port !== MITM_PORT) {" "        if (false as boolean) {"
echo "== 2: encender sin compuerta de sudo"; annul $F "          const password = resolveMitmSudoPassword(sudoPassword, deps.sudo.cached())
          if (deps.sudo.required(password)) return missingPassword()" "          const password = resolveMitmSudoPassword(sudoPassword, deps.sudo.cached())"
echo "== 3: keyId que no resuelve aceptado"; annul $F "    return keyId ? null : ''" "    return ''"
echo "== 4: regenerar con el servidor en marcha"; annul $F "        if ((await deps.server.status()).running) {" "        if (false as boolean) {"
echo "== 5: estadísticas sin comprobar el tipo"; annul $F "  const text = (value: unknown) => (typeof value === 'string' ? value : null)" "  const text = (value: unknown) => (value ?? null) as string | null"
echo "== 6: contraseña sin pedir aunque no esté guardada"; annul $F "          needsSudoPassword: !isWin() && !hasCachedPassword && deps.sudoPasswordRequired()," "          needsSudoPassword: !isWin() && deps.sudoPasswordRequired(),"
echo "== 7: alias sin validar el esfuerzo"; annul $F "        if (hasInvalidReasoningEffort(mappings)) return errorResponse({ status: 400, message: 'Invalid reasoning effort' })
" ""
echo "== 8: alias para un agente desconocido"; annul $F "        if (!AGENT_IDS.has(tool)) return errorResponse({ status: 404, message: \`Unknown agent: \${tool}\` })
" ""
echo "== 9: alias guardados sin normalizar"; annul $F "        const aliases = normalizeAliasMappings(mappings)" "        const aliases = mappings as never"
echo "== 10: lectura de un alias sin actualizar la forma heredada"; annul $F "aliases: tool ? normalizeAliasMappings(getMitmAlias(deps.db, tool)) : getAllMitmAliases(deps.db)," "aliases: tool ? getMitmAlias(deps.db, tool) : getAllMitmAliases(deps.db),"
echo "== 11: arrancar sin recordar la contraseña dada"; annul $F "        const result = await deps.server.start(apiKey, password, { port: MITM_PORT })
        rememberGiven(body.data.sudoPassword)" "        const result = await deps.server.start(apiKey, password, { port: MITM_PORT })"
echo "== 12: descarga sin comprobar el certificado"; annul $F "        if (!deps.cert.exists(certPath)) return errorResponse({ status: 404, message: 'MITM certificate not found' })
" ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
