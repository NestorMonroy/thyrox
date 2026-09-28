#!/usr/bin/env bash
# Anulaciones de #106d-6d: importación de agy y de CLIProxyAPI.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
A="src/accounts/imports/agyAuthImport.ts"; C="src/accounts/imports/cliProxyAuthImport.ts"
run() { timeout 120 bun test ./__tests__/accounts/imports/agyAndCliProxyImport.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 8: el método sólo del documento"; annul "$A" "authMethod: toNonEmptyString(doc.auth_method) ?? toNonEmptyString(token.auth_method)," "authMethod: toNonEmptyString(doc.auth_method),"
echo "== 25: sin proyecto no se degrada"; annul "$A" "        ...projectStatus(enriched),
        isActive: true," "        isActive: true,"
echo "== 27: el correo declarado no gana"; annul "$A" "  const email = options.email || enriched.email" "  const email = enriched.email || options.email"
echo "== restaurado"; run
