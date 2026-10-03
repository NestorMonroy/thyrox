# publish-quantizer-image

## El encargo

Antes de añadir `podman-execution-execute` a `src/session/control_plane_entries.tsv`,
Search Existing de sólo lectura: «Does control_plane_entries.tsv authorize an
executable as a whole, or can it authorize a constrained operation/capability?».
Ruta exigida: controller → petición declarada del plano de control →
PodmanExecutionPrimitive → build image → ledger/evidencia → wait. No un shell
genérico ni un `podman-execution-execute` genérico.

## Respuesta (MEASURED)

**Autoriza el ejecutable entero.** Ningún punto de la cadena mira el subcomando
ni los argumentos.

| Pieza | Dónde | Qué valida |
|---|---|---|
| declaración | `src/session/control_plane_entries.tsv` | columnas `name`, `module`, `why`; 7 entradas, ninguna de imagen |
| validador | `src/lib/managed_execution.sh:53-62` `thyrox_control_plane_entry` | basename de `$1` en la lista + la línea `exec` del candidato contiene el módulo; **sin** subcomando ni argumentos |
| llamador | `src/session/bg.sh:387` | `thyrox_control_plane_entry "$1"` — sólo `$1` |
| policy check | `src/hooks/detect_client_background.py:85-88,141-143` `is_declared_entry` | exime por nombre; `execution_policy.json` `controller.unmanagedPayloads: false` |
| tests | `tests/session/test-model-coordinator-entry.sh` caso 1 | sólo «es entrada declarada»; ningún test niega un subcomando |

Operaciones que quedarían alcanzables con la entrada genérica
(`executionCommand.ts:370-377`):

| Subcomando | Alcance | Seguro para el controller |
|---|---|---|
| `observe` | lectura del store vía dueño | sí (ya se usa así) |
| `build-image` | `RUN` de un Containerfile arbitrario, `--network host` | sólo con contexto/Containerfile acotados |
| `run` | ARGV arbitrario o `--script-stdin`, `--image` arbitraria, `--mount` arbitrario | **no** — vía de ejecución general |
| `remove-image` | destructivo | **no** — pone en riesgo las 31 imágenes preservadas |
| `reconcile-orphans` | mutación del store | no para este encargo |

`run` además acepta cualquier origen absoluto de montaje, `rw` incluido:
`parseMount` (`executionCommand.ts:88-95`) sólo exige `/` inicial;
`requireValidMount` (`workerResourceProfile.ts:117`) sólo exige no vacío;
`isUnder` (`executionAuthorization.ts:190,197`) sólo acota workdir y salidas.
Nada niega `/`, `$HOME` o el socket de Podman como origen (H-THYROX-429).

Entrada más estrecha existente para build/promote/publish: **ninguna**
(`ls bin`: sólo `typescript-build-javascript`, `artifact-registry-publish-artifact`,
corpus y documentación). `quantizer-image/build.sh` llama `build-image` sin
`--lifecycle` (resultado `cache`).

## Decisión

- Añadir `podman-execution-execute` tal cual: **RECHAZADO** (abre `run` y `remove-image`).
- REUSE de una entrada estrecha: no existe.
- Requirement registrado: *controller may request an authorized image build
  through PodmanExecutionPrimitive without gaining generic payload execution*.
- Mínima extensión: **EXTEND** la declaración y su validador con autorización
  por operación — columna de subcomandos permitidos (`build-image`, `observe`)
  validada en `thyrox_control_plane_entry` e `is_declared_entry` junto a
  `$2`, más acotar `--context`/`--containerfile` a definiciones versionadas
  del repo. Alternativa equivalente: un envoltorio `bin/` sólo-build que
  delegue a `build-image` y rehúse el resto.
- Estado: **BLOCKED_BY_BOOTSTRAP** — es código de producto; requiere la
  excepción específica del ejecutor (RED de política → declaración mínima →
  GREEN → anulación → negativos).

Negativos que esa extensión debe probar: shell payload arbitrario rehusado;
comando de anfitrión no gestionado rehusado; `run`/`remove-image`/
`reconcile-orphans` por la entrada rehusados; montaje del socket o de `/`
rehusado; worker gestionado sin acceso al store. Positivos: `build-image`
autorizado y `observe` declarado.

*Métrica:* lectura de código de validador, llamador, hook, dispatch y montaje.
*Ciega a:* comportamiento en ejecución — ninguna prueba se corrió; la
afirmación sobre `run` es por lectura, no por un montaje intentado.
