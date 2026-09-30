#!/usr/bin/env bash
# Sonda: ¿el search_path fijado en el arranque de la conexión llega a todas las conexiones del pool, begin incluido?
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
pg_isready -t 20
PASS=$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')
sudo -u postgres psql -v ON_ERROR_STOP=1 -q -c "ALTER ROLE thyrox_store_test PASSWORD '$PASS'" < /dev/null
URL="postgres://thyrox_store_test:$PASS@127.0.0.1:5432/thyrox_store_test" bun -e '
import { SQL } from "bun"
const url = process.env.URL
const admin = new SQL(url)
await admin.unsafe("CREATE SCHEMA IF NOT EXISTS probe_sp")
const setOnce = new SQL(url)
await setOnce.unsafe("SET search_path TO probe_sp")
const viaSet = await Promise.all([1,2,3,4].map(() => setOnce`SHOW search_path`))
const inBeginSet = await setOnce.begin(tx => tx`SHOW search_path`)
const viaOption = new SQL({ url, connection: { search_path: "probe_sp" } })
const opt = await Promise.all([1,2,3,4].map(() => viaOption`SHOW search_path`))
const inBeginOpt = await viaOption.begin(tx => tx`SHOW search_path`)
console.log("SET once, parallel:", viaSet.map(r => r[0].search_path).join(" | "))
console.log("SET once, in begin:", inBeginSet[0].search_path)
console.log("connection option, parallel:", opt.map(r => r[0].search_path).join(" | "))
console.log("connection option, in begin:", inBeginOpt[0].search_path)
await admin.unsafe("DROP SCHEMA probe_sp CASCADE")
for (const s of [admin, setOnce, viaOption]) await s.close()
' < /dev/null
