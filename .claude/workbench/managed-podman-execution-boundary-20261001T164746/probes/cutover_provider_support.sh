#!/usr/bin/env bash
# Mide qué soporte de proveedores API ya existe para `thyrox -p` dentro de una
# unidad, sin llamar a ningún proveedor. De las credenciales publica sólo el
# nombre y si están asignadas; nunca el valor.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
echo "# HEAD $(git rev-parse --short HEAD)"
echo "## upstream OpenAI-compatible en el proxy local"
git ls-files 'src/packages/provider/src/proxy/openaiCompat/*' | grep -v __tests__
echo "## claves de entorno que lo configuran (declaradas en .env.example)"
grep -oE '^THYROX_OPENAI_COMPAT_[A-Z_]+|^THYROX_ANTHROPIC_COMPAT_[A-Z_]+|^ANTHROPIC_BASE_URL|^THYROX_DEEPSEEK_[A-Z_]+|^THYROX_QWEN_[A-Z_]+' .env.example | sort -u
echo "## asignadas en .env (nombre=asignada|vacía; sin valor)"
for key in $(grep -oE '^(THYROX_OPENAI_COMPAT_[A-Z_]+|THYROX_DEEPSEEK_[A-Z_]+|THYROX_QWEN_[A-Z_]+|DEEPSEEK_API_KEY|DASHSCOPE_API_KEY)=' .env 2>/dev/null | tr -d '='); do
  value="$(grep -E "^$key=" .env | tail -1 | cut -d= -f2-)"
  [[ -n "$value" ]] && echo "$key=asignada" || echo "$key=vacía"
done
echo "## almacén de credenciales de proveedores"
git ls-files 'src/packages/provider/src/*' | grep -iE 'connection|credential|store' | grep -v __tests__ | head -20
echo "## secretos en la autorización de ejecución (no por argv)"
git grep -nE "ExecutionSecret|secrets\??:" -- src/packages/podman-execution/executionAuthorization.ts src/packages/podman-execution/executionCommand.ts </dev/null | head
git grep -nE "'--secret'|--secret" -- src/packages/podman-execution </dev/null | grep -v __tests__ | head
echo "## cómo pasa --env del CLI a podman (¿valor en argv?)"
git grep -nE "'--env'|environment" -- src/packages/podman-execution/executionCommand.ts src/packages/podman-execution/workerContainerLifecycle.ts </dev/null | head -12
echo "## selección de modelo en thyrox -p / proxy por nombre"
git grep -nlE "THYROX_OPENAI_COMPAT_MODEL|openaiCompat" -- src/packages --  ':!*__tests__*' </dev/null | head -12
echo "## rastros de Claude en el pool por defecto"
grep -nE "PROVIDER_RUNTIME=|claude-cli|--runner" src/session/headless-pool.sh | head -8
