#!/usr/bin/env bash
# Anulaciones de #106a: se retira cada mitad de juicio del cifrado en reposo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts"
run() { timeout 120 bun test __tests__/accounts/fieldCipher.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: el tag sin longitud fija"; annul "$F" ", { authTagLength: AUTH_TAG_LENGTH })" ")"
echo "== 2: cifrar dos veces"; annul "$F" "    if (plaintext.startsWith(PREFIX)) return plaintext
" ""
echo "== 3: una clave en blanco cuenta como declarada"; annul "$F" "  const declared = secret?.trim() ? secret : undefined" "  const declared = secret || undefined"
echo "== 4: el aviso de texto plano en cada escritura"; annul "$F" "      reportOnce('plaintext'," "      report("
echo "== 5: sin marcar la conexión indescifrable"; annul "$F" "      return { ...decrypted, credentialDecryptFailed: true } as typeof row" "      return decrypted as typeof row"
echo "== 6: decryptQuiet informa cada lectura"; annul "$F" "        reportOnce(\`\${meta.provider}::\${meta.connectionId}::\${meta.field}:\${ciphertext}\`, " "        void 0, report("
echo "== 7: sin migrar lo de la sal derivada"; annul "$F" "      return plaintext === null ? { updated: false, value: ciphertext } : { updated: true, value: encrypt(plaintext) }" "      return { updated: false, value: ciphertext }"
echo "== 8: otra sal fija"; annul "$F" "const INTEROPERABLE_SALT = 'omniroute-field-encryption-v1'" "const INTEROPERABLE_SALT = 'thyrox-field-encryption-v1'"
echo "== 9: sin clave, el cifrado se devuelve tal cual"; annul "$F" "    return key ? decryptWith(key, ciphertext) : null" "    return key ? decryptWith(key, ciphertext) : ciphertext"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
