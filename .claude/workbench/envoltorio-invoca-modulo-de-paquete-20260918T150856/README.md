# envoltorio-invoca-modulo-de-paquete

## El encargo

<!-- verbatim, sin parafrasear -->

> vas a continuar en /loop y en automatico con todas las implementaciones que
> tenemos de thyrox, corregir todos los TEST que estan en RED, y realizar las
> implementaciones pendientes de claude-code-nestor-monroy-tools para thyrox,
> considera analizar, actualizar o implementar en TDD, y documentar […]
> tienes que usar las herramientas de thyrox/bin/

Tarea concreta del pase: **TASK-THYROX-0074** — *«Dos envoltorios de bin/
invocan un módulo de paquete como guion y mueren»*.

## La premisa, si se corrigio al primer comando

La tarjeta traía DOS mitades y las dos se sostienen al medirlas:

1. los envoltorios mueren con `ImportError` — reproducido, exit 1 en los dos;
2. `--check` publica «al día» sobre ellos — reproducido, y su causa es
   estructural: compara contra el PLAN, así que un plan equivocado coincide
   consigo mismo.

Lo que **no** estaba en la premisa y apareció al medir: una **fuga de fixture**
en la propia suite del generador (H-THYROX-85), que regeneraba el `bin/` real
y cerró en silencio una deriva (`bin/archive_build_corpus`).

## Las piezas

| archivo | que hace |
|---|---|
| `probes/probe_import_by_path.py` | carga un entrypoint por ruta con la semántica de CPython (`sys.path[0]` = directorio del guion) sin ejecutar `main()`; su primera versión omitía ese detalle y publicaba 9 rojos donde hay 4 |
| `outputs/01-rojo-los-dos-envoltorios-mueren.txt` | la mitad roja de conducta, con su control sano |
| `outputs/02-el-universo-por-dos-instrumentos.txt` | AST (2 de 137) contra conducta (4 de 137, en tres clases) |
| `outputs/03-control-de-anulacion-del-criterio.txt` | por qué NO se emite `-m` para los 137: la forma universal arregla 2 y rompe 4 |
| `outputs/04-rojo-de-la-suite.txt` | la mitad roja de la suite, antes de implementar |
| `outputs/05-check-desactualizado.txt` | `--check` declarando la divergencia con el generador ya corregido y `bin/` sin regenerar |
| `outputs/06-verde-tras-regenerar.txt` | verde en las dos direcciones + los 4 de nombre plano intactos |
| `outputs/07-fuga-de-fixture-y-su-anulacion.txt` | el intruso que muere sin el arreglo y sobrevive con él |
| `outputs/08-rojo-del-segundo-eje.txt` | `--exercise` no existe todavía |
| `outputs/09-verde-del-segundo-eje.txt` | `--exercise` verde, compone con `--check`, y los controles de anulación verbatim |

## Los resultados

- `needs_package_context()` + `module_dotted_name()` en `generate_bin.py`: el
  envoltorio de un módulo con import relativo entra por `-m paquete.modulo`.
- `--exercise`: carga cada entrypoint `.py` por la puerta de su envoltorio y
  discrimina **cableado** (`ImportError`) de **política** (cualquier otra
  excepción). 5.1 s sobre 137, opt-in.
- La suite pasa de **68** a **89 aserciones**, 0 fallidas — el 68 medido
  corriendo `git show HEAD:tests/session/test_generate_bin.py` contra el árbol
  ya regenerado, no recordado.
- La fuga de fixture cerrada con `_synthetic_root()` + `THYROX_ROOT` en el
  entorno del subproceso.

*Metrica:* `ImportFrom` con `level > 0` por AST sobre los entrypoints que
`discover_entrypoints` devuelve; la clase de excepción al cargar cada uno en un
subproceso; y la supervivencia de un archivo intruso en `bin/` tras correr la
suite.
*Ciega a:* un módulo que falle **después** de importar por una razón de
cableado; los 42 entrypoints `.sh`, que no tienen puerta de import; y otra
suite del árbol que escriba en la raíz real — eso lo censa TASK-THYROX-0164.
