# Autoridad de sensibilidad de nombres de entorno — fuente de verdad del pool

Contexto medido (2026-10-02): cinco clasificadores de «secreto» por regex de nombre en tres
lenguajes, con reglas distintas (`task_continuation.py:379`, `worker_secret_inheritance.sh:11`,
`imageStore.ts:48`, `workerResourceProfile.ts:64`; `learning/experience.py:22` es del corpus de RL
y NO se toca). Sobre las 560 claves de `.env.example` discrepan en 8 (`*_PATH`, por `_PAT`), las
tres toman `*_TOKENS` por credencial y ninguna ve `THYROX_SEMANTIC_SEARCH_DATABASE_URL` ni
`THYROX_TEST_POSTGRES_URL` (llevan usuario:contraseña) ni `THYROX_BG_CLAIM_AUTH`.

La autoridad ya existe como DATO: `src/verify/env_sensitivity.tsv` (`8ba5f6df4`), una fila por
nombre: `clave<TAB>clase<TAB>alcance<TAB>razón`, con clase `credential | secret-reference |
sensitive-config | config` y alcance `env` (declarada en `.env.example`) o `external` (nombre ajeno
que llega a una frontera). La clase la decide sólo esa tabla; el nombre es lint, nunca autoridad.
Un nombre sin fila es una violación de contrato, y una frontera que lo recibe lo rehúsa.

Contrato rector: conservar ≠ montar ≠ indexar ≠ revelar.

## [128] TASK-THYROX-0765 — Clasificar los nombres de entorno desde una autoridad declarativa

TDD. `src/verify/env_sensitivity.py`: biblioteca y CLI (con `main()`, para que
`python3 src/session/generate_bin.py` genere `bin/env_sensitivity`; no edites `bin/` a mano, corre
el generador y comprueba con `--check`). Operaciones:

- `classify NOMBRE…` → una línea `NOMBRE<TAB>clase` por nombre; un nombre sin fila es `unclassified`.
- `list CLASE` → los nombres de esa clase, uno por línea, ordenados.
- `check` → el contrato: toda clave de `.env.example` (activa o comentada `# CLAVE=`) tiene fila
  `env`; ninguna fila `env` sin su clave en `.env.example`; clase y alcance válidos; sin
  duplicados. Sale 1 nombrando cada violación, 2 si no puede leer la tabla o `.env.example`, 0 si
  cumple, y publica su denominador.
- `lint` → avisos que nunca deciden: una clave cuya forma de nombre sugiere credencial y está
  clasificada `config`, o al revés. Sale 0 siempre.

Casos RED que deben pasar a verde:
- `THYROX_TOOLCHAIN_INTERPRETER_PATH` es `config` aunque contenga `_PAT`.
- `THYROX_CODE_MAX_OUTPUT_TOKENS` es `config` aunque contenga `TOKEN`.
- `CACHE_KEY_PREFIX` (sin fila) es `unclassified`, no `credential`, y `check` sobre un `.env.example`
  de prueba que la declara la nombra como violación.
- `THYROX_SEMANTIC_SEARCH_DATABASE_URL` y `THYROX_BG_CLAIM_AUTH` son `credential`.
- `check` sobre el árbol real sale 0.

Anulación: sustituir la consulta a la tabla por la regex vieja
`(TOKEN|KEY|PASSWORD|SECRET|_PAT|CREDENTIAL)` hace caer exactamente esos casos; dilo con números.
Cablea `check` en `.githooks/pre-commit` cuando el commit toca `.env.example` o la tabla.

## [129] TASK-THYROX-0766 — Rehusar credenciales en las fronteras de Podman por la autoridad

TDD. `src/packages/podman-execution/envSensitivity.ts` lee `src/verify/env_sensitivity.tsv`
(ruta desde `import.meta.dir`; sin dependencia nueva: la primitiva sigue neutral) y expone
`sensitivityOf(nombre)` → clase o `'unclassified'`. `imageStore.ts` (build-args) y
`workerResourceProfile.ts` (entorno del perfil) dejan su `CREDENTIAL_NAME_PATTERN` y consultan la
autoridad: rehúsan `credential`; rehúsan `unclassified` con un error que nombra la violación de
contrato y dónde clasificar; admiten `secret-reference`, `sensitive-config` y `config`.

Casos RED:
- un build-arg o entorno `THYROX_TOOLCHAIN_INTERPRETER_PATH` o `THYROX_CODE_MAX_OUTPUT_TOKENS` se admite;
- `CACHE_KEY_PREFIX` se rehúsa como `unclassified`, no como credencial;
- `THYROX_SEMANTIC_SEARCH_DATABASE_URL` se rehúsa como `credential`;
- `HTTPS_PROXY`, `OLLAMA_HOST`, `HOME`, `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `GIT_SSL_CAINFO` se
  admiten: los perfiles reales del árbol (jobEgress, el perfil del runtime de modelos,
  executionCommand) siguen pasando sus suites.

Anulación: volver a la regex `/(TOKEN|SECRET|PASSWORD|PASSWD|KEY|CREDENTIAL)/i` hace caer
exactamente esos casos.

## [130] TASK-THYROX-0767 — Tomar el inventario de secretos del trabajador de la autoridad

Segunda oleada: depende de 0765 integrada. Ver la tarjeta.

## [131] TASK-THYROX-0768 — Generar la referencia de cada variable de entorno desde la autoridad

Segunda oleada: depende de 0765 integrada. Ver la tarjeta.
