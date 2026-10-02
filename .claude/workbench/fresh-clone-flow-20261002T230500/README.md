# Flujo de un clon de thyrox desde cero — medido

Rama: `feature/fresh-clone-bootstrap`, creada desde la punta de
`origin/feature/complete-orm-root` (2ddda8f68, 1390 commits por delante de
`develop`). El sujeto es el propio clon de la sesión remota: sin `.env`, sin
`.venv`, sin `node_modules`, sin `core.hooksPath`.

## El recorrido, paso a paso, con lo que midió cada uno

| # | Paso del checklist (README) | Resultado en el clon recién bajado |
|---|---|---|
| 0 | `bash bin/check-toolchain-ready` | 3 ok · 4 error · 2 aviso: `githooks`, `awk`, `python-proveedor`, `sqlite-reader` |
| 1 | `bash src/session/write-env.sh` | escribe 6 claves; **no** escribe `THYROX_COMMIT_*`; aviso de `reach` por `THYROX_REACH_ROOTS` |
| — | `uv sync` | 1.1 s; resuelve `python-proveedor` y `sqlite-reader` |
| — | `gawk` | ausente en el contenedor: la sonda `awk` falla y `bin/replace_literal` sale 2. Se instaló con `apt-get install gawk` |
| 4 | `bash install.sh --check` | **exit 1**: `bin/` desactualizado, falta `bin/detect_controller_mutation` |
| — | `bash bin/generate_bin` | 1 envoltorio escrito; `--check` en verde (321) |
| 4 | `bash install.sh <raíz>` | exit 0; activa `core.hooksPath`; preflight 7 ok · 0 error · 2 aviso |

`bun install` no se corrió: su sonda es `aviso` y la mitad TS no se tocó.

## El defecto que importa: el agente firmaba el commit sin que nada lo parara

Medido con `git var`, antes de declarar nada:

```text
GIT_AUTHOR_IDENT     Nestor Monroy <46802445+NestorMonroy@users.noreply.github.com>   (entorno)
GIT_COMMITTER_IDENT  Claude <noreply@anthropic.com>                                     (~/.gitconfig)
commit_identity check -> «SIN MEDIR — THYROX_COMMIT_AUTHOR no está declarada», exit 2
```

El pre-commit trata el exit 2 como aviso y no bloquea. La cabecera del módulo
declaraba el invariante como «no es un parámetro», pero `check_identities`
leía la declaración **antes** de mirar al agente y rehusaba sin medirlo. En un
clon nuevo, el primer commit salía con el committer que `git.md` prohíbe, y el
preflight publicaba verde porque no tenía sonda de identidad.

### Corrección

1. `src/verify/commit_identity.py` — el invariante del agente se mide antes y
   sin declaración (`check_agent_invariant`, `agent_roles`); `IdentityUndeclared`
   sólo se propaga cuando el invariante se cumple. Subcomando nuevo `agent`
   para el preflight. El mensaje de corrección nombra las dos claves cuando no
   hay declaración, porque `commit_identity env` fallaría ahí.
2. `src/lib/toolchain.sh::thyrox_toolchain_require_commit_identity` y su
   entrada `commit-identity|error` en `check-toolchain-ready.sh`, tras
   `githooks`. Delega en `commit_identity agent`: el correo del agente vive en
   un solo sitio.
3. README: paso 3b del checklist.

### Evidencia (en `evidence/`)

| Archivo | Qué es |
|---|---|
| `red-agent-undeclared.txt` | mitad roja de Python: `IdentityUndeclared` sin declaración |
| `annulment.txt` | anulación de la rama nueva: caen 2 de 13, las dos nuevas |
| `green.txt` | 13 de 13 (después 15 de 15 con `check_agent_invariant`) |
| `red-preflight-identity.txt` | mitad roja shell: 18 casos, 3 fallos — los tres nuevos |
| `annulment-preflight-identity.txt` | sonda anulada a `return 0`: caen 2, los dos de rechazo; el caso ok sobrevive |
| `green-preflight-identity.txt` | 18 de 18 |
| `derived-*.txt`, `baseline-*.txt` | subconjunto derivado; ver abajo |

Subconjunto derivado (`grep -rlE "check-toolchain-ready|thyrox_toolchain_require_githooks|commit_identity" tests/`):

| Suite | Resultado | Atribución |
|---|---|---|
| `tests/install/test_install.sh` | 68/68 | — |
| `tests/lib/test-toolchain-texlive.sh` | 11/11 | — |
| `tests/lib/test-toolchain-degraded.sh` | 15/16 | **preexistente**: el mismo caso cae con los archivos de `HEAD` (`baseline-test-toolchain-degraded.txt`); depende de `node_modules` |
| `tests/verify/test_tsc_cycle.py` | `CalledProcessError` en `bin/agent-recommend analisis` | **preexistente**: idéntico con los archivos de `HEAD` |

*Métrica:* exit y aserciones de cada suite, y la identidad que `git var` publica.
*Ciega a:* la suite entera (`bash tests/run.sh` no se corrió: exige
`bun install` y ~445 s); un commit hecho con `--no-verify`; y que la identidad
humana declarada sea la de quien escribió el cambio.

## Hallazgos que quedan abiertos (no se corrigen en esta rama)

1. **Identificadores en español en la superficie pública.** 17 de 321
   envoltorios de `bin/` llevan palabras en español (`agrupar_tareas_por_familia`,
   `check-artefactos-minimos`, `check-hallazgo-sucesor`, `check-ids-duplicados`,
   `check_cifra_de_artefacto_vivo`, `check_corpus_al_dia`, `check_eventos_hook`,
   `check_hallazgo_submodulo`, `check_hallazgos_index`, `check_veredicto_de_gate`,
   `check-workflow-refutacion`, `hallazgo_ids`, `instalar-hooks-sesion-multirepo`,
   `vecinos_de_tarea`, `verificar_persistencia`, `verificar_premisa`,
   `verificar_rutas_de_hook`), y variables de los githooks (`RAIZ`,
   `ENVOLTORIO`, `CODIGO`). El gate `check_identifier_language` es
   prospectivo sobre lo staged; renombrar un envoltorio rompe a los
   consumidores que lo citan, así que exige su propio censo de citas y un
   periodo de alias. Medido con:
   `ls bin | grep -E "(^|[_-])(agrupar|tareas|…)([_-]|$)"` (léxico a mano: ciego
   a palabras fuera de esa lista).
2. **`gawk` no tiene instalador opt-in** como `parallel` o `rsync`; la sonda
   sólo nombra `THYROX_TOOLCHAIN_AWK_BIN=gawk`, que no sirve si el binario no
   existe, y `bin/replace_literal` —la forma prescrita para reemplazar texto—
   rehúsa.
3. **`write-env.sh` no deriva la identidad**: es parámetro del consumidor
   (DEC-04), así que se declara a mano; el preflight ahora lo dice.
4. **`bin/` desactualizado en la punta de `complete-orm-root`**: ningún gate
   de commit corre `generate_bin --check`; aquí se regeneró.
5. **`eval "$(bin/commit_identity env)"` no persiste entre llamadas** de la
   herramienta Bash del entorno remoto: cada comando que commitea lo repite.

## Search Existing — antes de dar por buenas las piezas nuevas

Instrumento: `probes/search_existing_repo_wide.sh` (cuatro pasadas, sólo
lectura, adaptado de
`math-specialist-capability-20261002T211311/probes/search_existing_repo_wide.sh`),
salida en `outputs/search-existing/`. Raíz: el índice de git de este clon.
**Superficie NO buscada:** `kaupamex-docs` y los demás consumidores, ausentes
del contenedor.

| Concepto | Autoridad canónica | Otros candidatos y por qué no son la autoridad |
|---|---|---|
| invariante «el agente no firma» | `src/verify/commit_identity.py` (`AGENT_EMAILS`) | `branchIntegration.ts:35-37` fija `EXPECTED_COMMITTER_*` en código para el merge de integración: es otra copia del valor declarado en `THYROX_COMMIT_COMMITTER`, no del invariante. `attribution.ts:55` produce el remolque que el gate prohíbe; `reconcile_user_hooks.py` parchea el stop hook del anfitrión. Ninguno mide el próximo commit. |
| preflight de un clon | `src/verify/check-toolchain-ready.sh` + `src/lib/toolchain.sh` (`PROBES`) | ninguna sonda de identidad existía; `check_githooks_activos.py` mide sólo la activación |
| arranque del clon | `install.sh` → `src/verify/install-hooks.sh` → `src/session/clone_bootstrap.py` | `scripts/install-hooks.sh` es la forma corta anterior (sólo `core.hooksPath`) |

Decisión: **extender** las dos autoridades, no crear una tercera. La sonda
nueva no repite el correo del agente: delega en `commit_identity agent`.

El origen del gate es `commit-identity-gate-20260922T230516/`. Su «sin
declaración sale 2, SIN MEDIR» se midió en un consumidor **sin** el agente en
la identidad; el caso «sin declaración y con el agente» no se midió ahí. El
encargo de entonces ya decía *«no queremos Claude <noreply@anthropic.com>»*:
este cambio extiende ese invariante, no revierte una decisión.

### Lo que la búsqueda destapó y no se corrige aquí

6. **`reconcile_user_hooks.py` no tiene invocador.** Existe para retirar del
   stop hook del anfitrión (`~/.claude/stop-hook-git-check.sh`) el consejo
   `git config user.name Claude` + `--reset-author`, que `git.md` prohíbe. En
   esta sesión `bin/reconcile_user_hooks --check` publica
   `PENDIENTE stop-hook-signature-only`, y ni `install.sh`, ni
   `install-hooks.sh`, ni el preflight lo corren (`git grep reconcile_user_hooks`
   fuera de su módulo y su suite: sólo baselines y un log). Con el gate de
   identidad corregido, seguir ese consejo ahora se bloquea en el pre-commit;
   el consejo sigue apareciendo.
7. **`branchIntegration.ts:35-37` es una segunda fuente del committer.** Si la
   declaración `THYROX_COMMIT_COMMITTER` cambia, el merge de integración sigue
   exigiendo `jcg-admin`.
8. Tareas ya registradas sobre el mismo flujo, con cita efímera en el store:
   «Empaquetado P8 — instalar activa y verifica los githooks de cada clon»
   (pending), P12 y P13 (pending). Esta rama no las cierra.

## Lo que destapó el primer commit con los githooks activos

El checklist termina en `install.sh` y `tests/run.sh`; el primer commit real
exigió además, en este orden:

| Rehúse | Causa | Remedio aplicado (`.env` no versionado) |
|---|---|---|
| `check_identifier_language`: «El baseline de deuda heredada no está declarado» | `write-env.sh` no escribe `IDENTIFIER_LANGUAGE_BASELINE`; `.env.example:942-948` la documenta vacía | `IDENTIFIER_LANGUAGE_BASELINE=<raíz>/.claude/baselines/identifier_language_baseline.txt`, `IDENTIFIER_LANGUAGE_ROOTS=src:tests` |
| `check-lint-zero`: «falta el verificador `shellcheck`» | `uv sync` sin `--group lint` | `uv sync --group lint` |
| `check_bench_untracked` | la salida del propio commit se escribió dentro del banco | escribirla fuera del banco |

9. **El preflight no ve ninguno de los dos primeros**: publica 7 ok y el
   commit rehúsa después. Las dos claves y el grupo `lint` son candidatos a
   sonda, con la misma forma que `commit-identity`.
10. **Hallazgo sin `H-THYROX-NNN`.** `bin/hallazgo_ids propose-id THYROX`
    rehúsa (`ReachRootError`): el corpus `kaupamex-docs` no está en el
    contenedor, y un número tomado sólo del store podría estar ocupado por un
    `.rst`. Queda en este banco hasta registrarlo desde un clon con el
    consumidor.
