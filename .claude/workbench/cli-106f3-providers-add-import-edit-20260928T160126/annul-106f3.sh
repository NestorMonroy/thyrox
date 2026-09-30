#!/usr/bin/env bash
# Anulaciones de #106f-3: add, edit, import y el prompt oculto.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/cli"
D=src/commands/providers
run() { timeout 150 bun test ./__tests__/providersWriteVerbs.test.ts ./__tests__/providersSecretPrompt.test.ts 2>&1 | gawk '/^\(fail\)/{n++} END{print " " n+0 " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: nombre sin defecto"; annul "$D/connectionPayload.ts" "isBlank(options.name) ? provider : options.name" "options.name ?? ''"
echo "== 2: prioridad cero"; annul "$D/connectionPayload.ts" " || priority < 1)" ")"
echo "== 3: prioridad decimal"; annul "$D/connectionPayload.ts" "!Number.isInteger(priority) || " ""
echo "== 4: datos no objeto"; annul "$D/connectionPayload.ts" "    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw" "    if (!parsed) throw"
echo "== 5: modelo sin recortar"; annul "$D/connectionPayload.ts" "String(options.defaultModel).trim()" "String(options.defaultModel)"
echo "== 6: tipo sin fijar"; annul "$D/connectionPayload.ts" ", authType: 'apikey' }" " }"
echo "== 7: nombre de variable libre"; annul "$D/credentialInput.ts" "    if (!ENV_NAME.test(envName)) throw" "    if (false) throw"
echo "== 8: variable vacía aceptada"; annul "$D/credentialInput.ts" "    if (!value) throw new Error(\`Environment variable" "    if (value === undefined) throw new Error(\`Environment variable"
echo "== 9: variable sin recortar"; annul "$D/credentialInput.ts" "sources.env[envName]?.trim()" "sources.env[envName]"
echo "== 10: stdin vacío aceptado"; annul "$D/credentialInput.ts" "    if (!value) throw new Error('Credential stdin was empty.')" "    void value"
echo "== 11: pregunta sin terminal"; annul "$D/credentialInput.ts" "  if (!options.prompt || !sources.interactive) return undefined" "  if (!options.prompt) return undefined"
echo "== 12: sin prompt"; annul "$D/credentialInput.ts" "  const value = (await sources.promptSecret('Provider credential (hidden): ')).trim()" "  const value = ''"
echo "== 13: credencial por argumento"; annul "$D/writeVerbs.ts" "  if (passesCredentialAsArgument(args)) {
    deps.write(\`\${CREDENTIAL_ARGUMENT_REFUSED}\n\`)
    return EXIT_USAGE
  }
  const dryRun" "  const dryRun"
echo "== 14: posicional ingenuo"; annul "$D/writeVerbs.ts" "const provider = firstPositional(args, VALUE_FLAGS)?.trim()" "const provider = args.find(arg => !arg.startsWith('--'))?.trim()"
echo "== 15: sin credencial exigida"; annul "$D/writeVerbs.ts" "    if (!credential && !dryRun && !allowNone) throw new Error(CREDENTIAL_REQUIRED)" "    void CREDENTIAL_REQUIRED"
echo "== 16: no-credential pregunta"; annul "$D/writeVerbs.ts" "allowNone ? undefined : await resolveCredential" "await resolveCredential"
echo "== 17: ensayo escribe"; annul "$D/writeVerbs.ts" "    if (dryRun) {
      const preview = { action: 'providers.add'" "    if (false) {
      const preview = { action: 'providers.add'"
echo "== 18: ensayo muestra secreto"; annul "$D/writeVerbs.ts" "credential: credentialShape(credential)," "credential,"
echo "== 19: datos sin redactar"; annul "$D/writeVerbs.ts" "payload.providerSpecificData ? redactSecrets(payload.providerSpecificData) : null" "payload.providerSpecificData ?? null"
echo "== 20: add muestra secretos"; annul "$D/writeVerbs.ts" "json({ connection: publicConnection(created) })" "json({ connection: created })"
echo "== 21: activo e inactivo"; annul "$D/writeVerbs.ts" "  if (active && inactive) {" "  if (false) {"
echo "== 22: edit prioridad libre"; annul "$D/writeVerbs.ts" "      changes.priority = parsePriority(priority)" "      changes.priority = Number(priority)"
echo "== 23: edit sin cambios"; annul "$D/writeVerbs.ts" "    if (Object.keys(changes).length === 0) {" "    if (false) {"
echo "== 24: edit pregunta"; annul "$D/writeVerbs.ts" "await resolveCredential(args, deps, { prompt: false })" "await resolveCredential(args, deps, { prompt: true })"
echo "== 25: edit ensayo escribe"; annul "$D/writeVerbs.ts" "    if (hasFlag(args, 'dry-run')) {
      const preview = { action: 'providers.edit'" "    if (false) {
      const preview = { action: 'providers.edit'"
echo "== 26: inactivo ignorado"; annul "$D/writeVerbs.ts" "    if (active || inactive) changes.isActive = active" "    if (active) changes.isActive = active"
echo "== 27: existente no se salta"; annul "$D/writeVerbs.ts" "  if (found) return" "  if (false) return"
echo "== 28: identidad sensible a caja"; annul "$D/writeVerbs.ts" "\`\${String(provider ?? '').toLowerCase()}\0\${String(name ?? provider ?? '').toLowerCase()}\`" "\`\${String(provider ?? '')}\0\${String(name ?? provider ?? '')}\`"
echo "== 29: entrada sin proveedor"; annul "$D/writeVerbs.ts" " || !(entry as Row).provider) return" ") return"
echo "== 30: archivo aporta id"; annul "$D/writeVerbs.ts" "    const created = deps.store.create(payload)
    if (!created) throw new Error(\`Provider connection '\${name}' was not created.\`)" "    const created = deps.store.create({ ...fields, ...payload })
    if (!created) throw new Error(\`Provider connection '\${name}' was not created.\`)"
echo "== 31: sigue tras error"; annul "$D/writeVerbs.ts" "    if (!result.ok && !hasFlag(args, 'continue-on-error')) break" "    void result"
echo "== 32: entrada sin credencial"; annul "$D/writeVerbs.ts" "    if (!credential && fields.allowNoCredential !== true) throw" "    if (false) throw"
echo "== 33: ensayo importa"; annul "$D/writeVerbs.ts" "    if (dryRun) return { provider, name, ok: true, status: 'would_create' }" "    void dryRun"
echo "== 34: archivo vacío aceptado"; annul "$D/writeVerbs.ts" "  if (entries.length === 0) {" "  if (false) {"
echo "== 35: forma providers ignorada"; annul "$D/writeVerbs.ts" "Array.isArray((parsed as Row | null)?.providers) ? ((parsed as Row).providers as unknown[]) : [parsed]" "[parsed]"
echo "== 36: prompt con eco"; annul "$D/secretPrompt.ts" "  input.setRawMode?.(true)" "  input.setRawMode?.(false)"
echo "== 37: sin retroceso"; annul "$D/secretPrompt.ts" "        if (BACKSPACE.has(char)) value = value.slice(0, -1)
        else value += char" "        value += char"
echo "== 38: Ctrl-C aceptado"; annul "$D/secretPrompt.ts" "        if (char === CTRL_C) return finish(() => reject(new Error('Credential prompt cancelled.')))" ""
echo "== 39: oyente sin retirar"; annul "$D/secretPrompt.ts" "      input.off('data', onData)" "      void onData"
echo "== restaurado"; run
