# TASK-THYROX-0499

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p5-credentials.md`

## La tarea

## [248] TASK-THYROX-0499 — Credenciales C6 — elegir la fuente de credencial en el pool

TDD. Cómo decide headless-pool entre el entorno de claude (sin credencial, máscara), el proxy con credencial del entorno (--credential-proxy) y el proxy con credenciales del store (C3). Cada rama se declara y la salida del pool dice cuál usó; ninguna cae a otra en silencio.

## Estado medido (2026-09-30, sesión que integra)

- `src/session/headless-pool.sh:355-377`: con `--credential-proxy` el pool lanza `bin/provider-credential-proxy` (o `HEADLESS_POOL_CREDENTIAL_PROXY`) con su entorno, espera `socket=<ruta>` y exporta `HP_PROXY_SOCKET`; a cada ítem le entrega `ANTHROPIC_UNIX_SOCKET` + `ANTHROPIC_API_KEY=ssh-placeholder`. Sin el flag, los ítems heredan el entorno del anfitrión y `thyrox -p` sin credencial delega en `claude -p`.
- El proxy de credencial ya abre el store existente (`provider/bin/credentialProxy.ts`: `openExistingConnectionStore()` antes de `resolveCredential`), así que la rama «store» (C3, `PROVIDER_CONNECTION`) ya la resuelve el proxy, no el pool.
- Hoy la salida del pool NO dice qué fuente usó.
- Restricción: nunca imprimir un valor de credencial; las credenciales se comprueban sólo por NOMBRE de variable. No reutilizar la credencial del anfitrión para sortear nada.

Qué falta, en TDD con su control de anulación: una decisión declarada (entorno/máscara · proxy con credencial del entorno · proxy con store) que el pool resuelve antes de lanzar, escribe en su salida (una línea `credencial: <fuente> (<por qué>)` y en el `index`/log del runtime) y que rehúsa con exit 2 y causa cuando la fuente pedida no está disponible, en vez de caer a otra.

## Archivos que te pertenecen

- `src/session/headless-pool.sh` (sólo el bloque de credencial y la línea de salida)
- una prueba nueva `tests/session/test-headless-pool-credential-source.sh`, con un proxy doble declarado por `HEADLESS_POOL_CREDENTIAL_PROXY` y un runner doble por `HEADLESS_POOL_RUNNER` (ver cómo lo hacen `tests/session/test-headless-pool.sh`)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
