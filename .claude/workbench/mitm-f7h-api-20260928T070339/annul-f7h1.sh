#!/usr/bin/env bash
# Anulaciones de F7h-1: se retira cada mitad de juicio de las rutas de estado y del normalizador.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F="src/api/routes/agentBridge src/api/routes/sudoRequest.ts"; N=src/client/normalizeState.ts; H=src/api/http.ts
run() { bun test __tests__/api __tests__/client/normalizeState.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: PATCH sin validar el id"; annul "$F" "        if (!isAgentId(params.id)) return errorResponse({ status: 404, message: \`Agent not found: \${params.id}\` })
" ""
echo "== 2: PUT de asignaciones sin validar el id"; annul "$F" "        if (!isAgentId(params.id)) return unknownAgent(params.id)
        const body = await parseJsonBody(request, AgentBridgeMappingPutSchema)" "        const body = await parseJsonBody(request, AgentBridgeMappingPutSchema)"
echo "== 3: modelos detectados de cualquier fuente"; annul "$F" "req.source === 'agent-bridge' && req.agent === agentId" "req.agent === agentId"
echo "== 4: modelos detectados sin ordenar"; annul "$F" "detectedModels: [...models].sort()," "detectedModels: [...models],"
echo "== 5: sin copiar las asignaciones al alias"; annul "$F" "        syncAgentBridgeMappingsToMitmAlias(db, params.id)
" ""
echo "== 6: DNS de un agente sin DNS activado"; annul "$F" "    s => s.dns_enabled && deps.dnsConfiguredFor(s.agent_id)," "    s => deps.dnsConfiguredFor(s.agent_id),"
echo "== 7: sudo pedido también en Windows"; annul "$F" "needsSudoPassword: !isWin && !hasCachedPassword" "needsSudoPassword: !hasCachedPassword"
echo "== 8: sudo pedido con contraseña en caché"; annul "$F" "needsSudoPassword: !isWin && !hasCachedPassword" "needsSudoPassword: !isWin"
echo "== 9: estado de agentes con la sonda real"; annul "$F" "    detection: deps.detectAgent(t.id)," "    detection: { installed: false },"
echo "== 10: DELETE de exclusión sin filtrar"; annul "$F" "getUserBypassPatterns(db).filter(p => p !== pattern)," "getUserBypassPatterns(db),"
echo "== 11: cuerpo inválido sin detalles"; annul "$H" "      details: z.flattenError(parsed.error)," ""
echo "== 12: normalizador sin la clave heredada certExists"; annul "$N" "  else if (typeof source.certExists === 'boolean') state.certTrusted = source.certExists
" ""
echo "== 13: normalizador sin comprobar el tipo"; annul "$N" "    if (typeof source[key] === kind) state[key] = source[key]" "    if (key in source) state[key] = source[key]"
echo "== 14: normalizador sin la forma nueva serverState"; annul "$N" "isRecord(raw.serverState) ? raw.serverState : " ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
