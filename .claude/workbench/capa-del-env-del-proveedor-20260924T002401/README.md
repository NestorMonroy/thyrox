# La capa del `.env` del proveedor, por el modelo del binario

**Pregunta.** Una clave de la familia por clon —`THYROX_WORKBENCH_DOCS`— la
declara el `.env` del PROVEEDOR (lo escribe `write-env.sh` y se versiona). Una
consulta hecha desde el consumidor sólo leía el `.env` del consumidor, que no
se versiona y en un clon nuevo no existe, así que el hogar del banco caía al
default. Es el rojo de `tests/verify/test_script_naming_scope.py` en l5 y l6.

**El binario del cliente (2.1.281) responde cómo se combinan fuentes**
(`cadenas-del-binario.txt`): recorre `userSettings → projectSettings →
localSettings → flagSettings → policySettings`, *«ordered low-to-high priority
— later entries override earlier ones»*, y aplica el `env` de cada una con
`Object.assign(process.env, …)`. La combinación es POR CLAVE: una clave que la
fuente específica no declara conserva el valor de la general.

**Traslado.** proceso > `.env` del consumidor (específica) > `.env` del
proveedor (general). Implementado como un tercer adaptador del puerto
conducido, `ProviderEnvFileDeclarations`, al final de `production_declarations`.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `test_declaration_port.py` con la clase `ProviderLayer`: 4 errores (no existía el parámetro) y el positivo real FALLA |
| `verde.txt` | 10 OK |
| `anulado-sin-capa.txt` | sin la capa: caen el respaldo y el positivo real |
| `anulado-capa-antes.txt` | la capa antes del consumidor: cae la precedencia |

`test_script_naming_scope.py`: 4 fallos → 8/0.

## v2 — la capa responde sólo la familia POR CLON del que pregunta

La suite completa sobre v1 (`.claude/jobs/suite-capa-proveedor-20260924T002440/`)
midió **+10 rojos de Python**: el `.env` del proveedor también declara SUS
hogares (`THYROX_CACHE_DIR`, `THYROX_WORKBENCH_DIR`…), y tratarlo entero como
capa general los filtraba a árboles sintéticos que esperaban el default. El
`userSettings` del binario vale para todos los proyectos; el `.env` del
proveedor no — sólo su familia `*_<SUFIJO>` es general para el consumidor.

| Archivo | Qué es |
|---|---|
| `rojo-v2.txt` | 2 fallos: el hogar propio y la familia de otro clon se filtraban |
| `verde-v2.txt` | 12 OK |

## v3 — el proveedor es el HERMANO del clon, no el árbol del módulo

v2 ubicaba al proveedor ascendiendo desde `reach.__file__`. Un árbol sintético
(`synthetic_clone_tree`) con clones `*-docs`/`*-api` leía entonces el `.env`
del proveedor REAL, cuyas `THYROX_WORKBENCH_DOCS`/`_API` hacían aparecer como
declarados a los clones sintéticos: `cache/test_home_resolution` perdía sus dos
clones observables. Dos correcciones, cada una con su anulación:

1. el proveedor es el hermano del clon que lleva el marcador `src/paths/reach.py`;
2. un `THYROX_ENV_FILE` declarado apaga la capa: dice QUÉ archivo gobierna.

| Archivo | Qué es |
|---|---|
| `rojo-v3.txt` | 3 fallos: los dos del hermano y el de `THYROX_ENV_FILE` |
| `verde-v3.txt` | 15 OK |
| `anulado-env-file.txt` | sin la guarda de `THYROX_ENV_FILE`: cae exactamente 1 |
| `anulado-hermano.txt` | volviendo al ascenso desde el módulo: caen exactamente 2 |

*Métrica:* aserciones de `tests/paths/test_declaration_port.py`.
*Ciega a:* un proveedor que no viva junto al consumidor — no aporta capa.
