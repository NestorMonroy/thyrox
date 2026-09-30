# bg-live-log-runtime

## El encargo

> Live artifacts (including `salida.log` of thyrox-bg) go under the runtime.
> (spec del ciclo de vida del pool, test 9)

## La premisa, si se corrigio al primer comando

`thyrox-bg start` en modo familia escribía `outputs/salida.log` en vivo dentro
de `.claude/jobs/<run>/`. Un `git add` a mitad del trabajo versionaba un log
incompleto, y `check_staged_live_writers` lo habría rechazado sin que el run
tuviera otra forma de existir.

## Las piezas

| archivo | que hace |
|---|---|
| `regress.sh` | corre cada suite de `probes/suites.txt` y publica su última línea |
| `isolation.sh` | corre las suites de `bg.sh` y cuenta los directorios nuevos en el runtime real |
| `probes/suites.txt` | las suites que invocan `bg.sh` o consumen `<n>.closed` |
| `outputs/red.txt` | la suite nueva contra `bg.sh` sin el cambio |
| `outputs/green.txt` | la suite nueva con el cambio |
| `outputs/nullified-live-log.txt` | control: `LOG="$FINAL_LOG"` hace caer exactamente las 4 aserciones de vida |
| `outputs/regress.txt` | regresión con exit 0 |
| `outputs/isolation.txt` | 0 directorios nuevos en el runtime real |

## Los resultados

El log vivo se escribe en `$THYROX_RUNTIME_DIR/jobs/<run>/salida.log`; al
terminar, el envoltorio lo copia a un temporal del run y lo publica con `mv`,
junto a su `.time`, y retira el directorio vivo. `status`, `wait`, `log` y
`register` resuelven la ruta final si existe y la viva si no.

Seis suites aislaban `THYROX_JOBS_DIR` pero no el runtime y dejaban logs vivos
en el runtime real; ahora exportan `THYROX_RUNTIME_DIR`.

*Metrica:* aserciones de `test-bg-live-log.sh`; última línea de cada suite de
la regresión; directorios nuevos bajo `.thyrox/runtime/jobs`.
*Ciega a:* un trabajo matado con SIGKILL antes de publicar — su log queda en
el runtime y el run no lo recibe; y a un escritor que no sea el envoltorio.
