#!/usr/bin/env bash
# ¿El nombre existe en el destino real de la reexportación? Importa el
# módulo destino con Bun y mira sus claves.
pkg="$1"; name="$2"
case "$pkg" in
  repl) spec='@thyrox/provider/fastMode.js' ;;
  agent) spec='@thyrox/memory/sessionMemoryUtils' ;;
  app-host) spec='@thyrox/repl/stateStore.js' ;;
  storage) spec='@thyrox/mcp-runtime/macOsKeychainHelpers.js' ;;
esac
cd "$(dirname "$0")/../../../../src/packages/$pkg" || exit 2
bun -e "const m = await import('$spec'); console.log('$pkg\t$name\t' + ('$name' in m ? 'existe' : 'AUSENTE'))" 2>&1 | tail -1
