#!/usr/bin/env bash
# Anulaciones de #106d-1: se retira cada mitad de juicio de los flujos claude y codex.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth/flows"
run() { timeout 120 bun test __tests__/accounts/oauth/claudeCodexFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin client id se usa la cadena vacía"; annul "$F" "  if (!source.clientId) {" "  if (false) {"
echo "== 2: claude sin reautenticar"; annul "$F" "        prompt: 'login',
      })" "      })"
echo "== 3: el código pegado no se separa de su state"; annul "$F" "  const [authCode = '', pastedState = ''] = code.split('#')" "  const [authCode = '', pastedState = ''] = [code, '']"
echo "== 4: un bootstrap inalcanzable tumba el login"; annul "$F" "    } catch {
      return null
    }
  }

  return {" "    } finally {
    }
  }

  return {"
echo "== 5: el bootstrap no nombra la organización"; annul "$F" "  ['organization_uuid', 'organizationUUID']," ""
echo "== 6: el user agent por defecto sin versión"; annul "$F" "  return \`claude-cli/\${version} (external, cli)\`" "  return 'claude-cli'"
echo "== 7: el plan gratuito no se vincula al equipo"; annul "$F" "  if (team && (planType === 'free' || planType === '')) return" "  if (false) return"
echo "== 9: el intercambio de codex en JSON"; annul "$F" "        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({" "        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({"
echo "== 10: el id_token se lee como base64 sin UTF-8"; annul "$F" "Buffer.from(parts[1]!, 'base64url').toString('utf8')" "Buffer.from(parts[1]!, 'base64url').toString('latin1')"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/oauth/flows; run
