#!/usr/bin/env bash
# Anulaciones de la fase 3: el reenviador que reparte por clase de upstream,
# su cableado en startProxyServer y el reconocimiento de APIError por forma.
set -euo pipefail
cd /home/user/thyrox
W=.claude/workbench/cloud-sdk-forward-20260927T235948
P=src/packages/provider
export THYROX_ANNUL_TEST_TIMEOUT=400
bash bin/annul_parallel $P/src/proxy/sdk/cloudForwarder.ts $P/__tests__/proxySdkCloudForwarder.test.ts CLOUD_FORWARDER_MODULE $W/probes/annul-forwarder.tsv > "$W/outputs/annul-forwarder.out" 2>&1
bash bin/annul_parallel $P/src/proxy/startServer.ts $P/__tests__/proxyStartServer.test.ts PROXY_START_SERVER_MODULE $W/probes/annul-start.tsv > "$W/outputs/annul-start.out" 2>&1
bash bin/annul_parallel $P/src/proxy/sdk/sdkForward.ts $P/__tests__/proxySdkForward.test.ts SDK_FORWARD_MODULE $W/probes/annul-apierror.tsv > "$W/outputs/annul-apierror.out" 2>&1
# El requestId de server.ts lo lee la prueba de startServer: la copia del
# servidor vive en un árbol sombra propio y la prueba importa su startServer.
S=.claude/cache/cloud-forward-request-id/$$
trap 'rm -rf "${S:?}"' EXIT
mkdir -p "$S" && cp -r $P/src "$S/src"
sed -i '/^        requestId,$/d' "$S/src/proxy/server.ts"
cmp -s $P/src/proxy/server.ts "$S/src/proxy/server.ts" && { echo 'NO-CAMBIO' > "$W/outputs/annul-request-id.out"; exit 0; }
{ PROXY_START_SERVER_MODULE="$PWD/$S/src/proxy/startServer.ts" timeout 400 bun test $P/__tests__/proxyStartServer.test.ts 2>&1 || true; } | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)' > "$W/outputs/annul-request-id.out"
