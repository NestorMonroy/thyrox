# Search Existing Thyrox Mechanisms — flujo de un clon nuevo (TASK-THYROX-0912)

Medido 2026-10-02 sobre el índice de git de `/home/user/thyrox`, rama
`feature/fresh-clone-bootstrap`. Instrumentos: `probes/search_existing_repo_wide.sh`
(pasadas A–D, `outputs/search-existing/`) y `probes/authority_health.sh`
(`outputs/authority-health/`). *consumers* = archivos fuera de pruebas que
nombran el nombre base de la autoridad; *tests* = archivos de prueba que lo
nombran. Superficie NO buscada: `kaupamex-docs` y los demás consumidores,
ausentes del contenedor.

*Métrica:* declaraciones, citas por nombre base y conducta de las suites.
*Ciega a:* un mecanismo cuyo nombre y comentarios no usen ninguno de los
términos consultados; y a los nombres base genéricos (`install`, `toolchain`),
cuyo conteo de consumidores no discrimina (marcado «n/d»).

| capability | existing authority | file | class/function/signature | consumers | tests | decision | next action |
|---|---|---|---|---|---|---|---|
| el agente no firma el commit | `AGENT_EMAILS`, `check_identities` | `src/verify/commit_identity.py` | `check_agent_invariant(repo, env) -> list[str]` (nuevo); `check_identities(repo, source, env) -> list[Violation]` | 10 | 2 | **EXTEND** (hecho) | ninguna: el invariante ya no depende de la declaración |
| identidad humana declarada | `THYROX_COMMIT_AUTHOR`, `THYROX_COMMIT_COMMITTER` | `src/rules/definitions/gitAuthorIdentity.ts`; `commit_identity.py::declared_identities` | `declared_identities(source, start) -> dict[str, Identity]` | 2 | 1 | REUSE | declararla en `.env` (paso 3b del checklist) |
| committer esperado en la integración de ramas | `EXPECTED_COMMITTER_NAME/EMAIL` | `src/packages/coordination/branchIntegration.ts:35-37` | constantes literales | 2 | 3 | **DUPLICATE** de la declaración | leer `THYROX_COMMIT_COMMITTER` en vez del literal; tarea propia |
| remolques del agente | `agent_trailers` | `commit_identity.py` (commit-msg) | `agent_trailers(message_file, cwd) -> list[str]` | 10 | 2 | REUSE | — |
| activar githooks | `install-hooks.sh` | `src/verify/install-hooks.sh` (`scripts/install-hooks.sh` es la forma corta anterior) | `core.hooksPath=.githooks` + driver de merge + hooks de sesión | 9 | 5 | REUSE | dueño: `TASK-GEN-0692` (P8) |
| verificar githooks | `check_githooks_activos` | `src/verify/check_githooks_activos.py` | `--strict`, nombra clon y arreglo | 6 | 1 | REUSE | — |
| preflight de la cadena | `PROBES` | `src/verify/check-toolchain-ready.sh` + `src/lib/toolchain.sh` | `nombre\|clase\|función`; `thyrox_toolchain_require_commit_identity` (nuevo) | n/d | n/d | **EXTEND** (hecho) | sondas candidatas: `IDENTIFIER_LANGUAGE_BASELINE` y grupo `lint` |
| instalador | `install.sh` | `install.sh` | pasos 1–7; paso 6 delega en `install-hooks.sh --solo-mostrar` | n/d | n/d | REUSE | — |
| `.env` del clon | `write-env.sh` | `src/session/write-env.sh` | deriva por ascenso; no escribe identidad ni baseline (DEC-04) | 6 | 5 | REUSE | — |
| contrato de `.env` | `check_env_contract_keys` | `src/verify/check_env_contract_keys.py` | `--strict` | 12 | 2 | REUSE | — |
| hogares del clon | `ensure_homes` | `src/paths/ensure_homes.py` | crea los hogares ignorados por git | 4 | 3 | REUSE | — |
| hooks de sesión del clon | `clone_bootstrap.py` | `src/session/clone_bootstrap.py` | `--si` / `--solo-mostrar` | 4 | 5 | REUSE | nombrar en el checklist el paso que los escribe: `install.sh` sólo los muestra (decisión declarada: cambia la clave de caché) — dueño: `TASK-DOCS-0223` |
| stop hook del anfitrión | `reconcile_user_hooks.py` | `src/session/reconcile_user_hooks.py`, invocado por `src/session/session-start.sh:63` | `PATCHES`, `--check` | 4 | 2 | REUSE | corre sólo si el SessionStart está cableado (fila anterior); hoy `--check` da PENDIENTE |
| envoltorios de `bin/` | `generate_bin.py` | `src/session/generate_bin.py` | `--check` | n/d | 4 | REUSE | ningún gate de commit corre `--check`: candidato |
| idioma de identificadores | `check_identifier_language.py` | `src/verify/check_identifier_language.py` | baseline por `IDENTIFIER_LANGUAGE_BASELINE` | 12 | 9 | REUSE | declarar la clave en `.env`; renombrar los 17 envoltorios en español es tarea aparte |
| ejecución gestionada | `podman-execution-execute` | `bin/thyrox-bg start --task/--work` | `(--task TASK-<CAPA>-NNNN \| --work CONSUMIDOR:ID) --kind` | — | — | **BLOCKED** aquí | `podman` ausente: «Executable not found in $PATH» (`evidence/managed-execution/`). Dueño: `TASK-GEN-0716` (P12) |
| instalador de gawk | — | `toolchain.sh` sólo tiene la sonda | — | — | — | **MISSING** | instalador opt-in con el contrato de `thyrox_toolchain_require_parallel` |
| ejecutor de pruebas Python | `"$PYTHON_BIN" archivo.py` | `tests/run.sh:181` | — | — | — | REUSE | las reglas citan `uv run pytest`, y pytest no está declarado en ningún grupo de `pyproject.toml` |

## current health (medido 2026-10-02T23:20Z, `probes/authority_health.sh`, proceso en segundo plano)

No corrió como unidad gestionada: `thyrox-bg start --work thyrox:…` sale 1
sin `podman`. Línea base = los tres archivos de producción en `c5bea8e07`
(antes del cambio), mismas suites (`outputs/authority-health-baseline/`).

| authority | suite | resultado | línea base | atribución |
|---|---|---|---|---|
| `commit_identity.py` | `test_commit_identity.py` | 15/15 | — | — |
| `check_githooks_activos.py` | `test-githooks-activos.sh` | 15/15 | — | — |
| preflight | `test-toolchain-ready.sh` | 18/18 | — | — |
| sonda `awk` | `test-toolchain-gawk.sh` | 16/16 | — | — |
| `install.sh` | `test_install.sh` | 68/68 | — | — |
| `write-env.sh` | `test_write_env.py` | exit 0 | — | — |
| `check_env_contract_keys.py` | `test_env_contract_keys.py` | exit 0 | — | — |
| `clone_bootstrap.py` | `test-arranque-de-clon.sh` | 21/21 | — | — |
| `reconcile_user_hooks.py` | `test_reconcile_user_hooks.py` | exit 0 | — | — |
| `session-start.sh` | `test-session-start.sh` | 4/4 | — | — |
| `generate_bin.py` | `test_generate_bin.py` | 131/131 | — | — |
| `check_identifier_language.py` | `test_identifier_language.py` | 25/25 | — | — |
| pre-commit | `test_pre_commit_hook.py` | **5 FAIL** | 5 FAIL, los mismos | preexistente: el repo sintético no tiene `.env.example` y `check_env_example_coverage` rehúsa |
| `ensure_homes.py` | `test_ensure_homes.py` | **35/37** | 35/37 | preexistente: «clave de `.env.example` sin decidir» |
| pre-commit, idioma | `test-pre-commit-identifier-language.sh` | **2/4** | 2/4 | preexistente |
| `branchIntegration.ts` | `branchIntegration.test.ts` | **error** | — | sin `node_modules`: «Cannot find module '@thyrox/paths/reach.ts'»; no medible sin `bun install` |

Ningún rojo nace de este cambio. `test_undeclared_identity_warns_without_blocking`
está entre los rojos preexistentes; su identidad es `t <t@t>`, humana, así que
con el cambio sigue respondiendo «SIN MEDIR» cuando se repare su fixture.

## Orden de ejecución

1. EXTEND `commit_identity` + sonda `commit-identity` — hecho (RED → GREEN →
   anulación), `942af68cc`.
2. Checklist: nombrar el paso que escribe los hooks de sesión
   (`bash src/verify/install-hooks.sh` sin `--solo-mostrar`), del que depende
   `reconcile_user_hooks`. Decisión del ejecutor: cambia la clave de caché.
3. Sondas `identifier-language-baseline` y `lint` en el preflight, con la
   forma de `commit-identity`.
4. DUPLICATE de `branchIntegration.ts`: leer la declaración.
5. MISSING: instalador opt-in de gawk.
6. Fixture de `test_pre_commit_hook.py` con `.env.example`, y después un caso
   «agente sin declaración → el hook bloquea».
