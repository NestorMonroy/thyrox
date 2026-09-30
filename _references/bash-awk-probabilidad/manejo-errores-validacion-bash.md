# Manejo de errores y validación en scripts bash

Guía abstracta — aplica a cualquier script bash que reciba argumentos, lea archivos, o encadene comandos. El objetivo es que el script falle de forma clara y predecible, en vez de continuar con datos incorrectos o fallar con un error críptico a mitad de camino.

## 1. Las tres opciones que deberían estar al inicio de casi todo script

```bash
#!/usr/bin/env bash
set -euo pipefail
```

| Opción | Qué hace | Qué evita |
|---|---|---|
| `set -e` | El script se detiene inmediatamente si CUALQUIER comando falla (código de salida distinto de 0) | Que el script siga ejecutando pasos posteriores sobre un estado inválido porque un paso anterior falló silenciosamente |
| `set -u` | El script falla si usas una variable que nunca fue definida | Errores silenciosos por typos en nombres de variables (`$DIRECTOTIO` en vez de `$DIRECTORIO` se trataría como vacío sin esto) |
| `set -o pipefail` | En una tubería (`cmd1 \| cmd2`), el código de salida final refleja el primer comando que falló, no solo el último | Que un fallo en `cmd1` quede oculto porque `cmd2` sí tuvo éxito y el pipeline "parece" haber salido bien |

**Cuándo NO usar `set -e`:** si tu script depende de que un comando pueda fallar como parte normal de su lógica (por ejemplo, `grep` que no encuentra nada), tienes que manejarlo explícitamente para que no aborte todo el script:

```bash
set -euo pipefail
if grep -q "patron" archivo.txt; then
  echo "encontrado"
else
  echo "no encontrado"
fi
# el 'if' captura el código de salida de grep sin que set -e aborte el script
```

## 2. Validar la cantidad de argumentos antes de usarlos

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Error: se requieren 2 argumentos (archivo y directorio)" >&2
  echo "Uso: $0 <archivo> <directorio>" >&2
  exit 1
fi
```

Probado, salida real al correr sin argumentos:
```
Error: se requieren 2 argumentos (archivo y directorio)
Uso: ./validar.sh <archivo> <directorio>
exit=1
```

**Por qué el mensaje va a `stderr` (`>&2`) y no a `stdout`:** si alguien encadena tu script con otro (`./tuscript.sh | otro_comando`), los mensajes de error no deben mezclarse con la salida de datos real. Separarlos permite que herramientas posteriores en una tubería solo vean datos válidos.

## 3. Validar que archivos y directorios existan antes de operar sobre ellos

```bash
[ -f "$1" ] || { echo "Error: no existe el archivo $1" >&2; exit 2; }
[ -d "$2" ] || { echo "Error: no existe el directorio $2" >&2; exit 2; }
```

Probado con un archivo inexistente, salida real:
```
Error: no existe el archivo archivo_falso
exit=2
```

**Otros chequeos útiles de `test`/`[ ]`:**

| Chequeo | Qué verifica |
|---|---|
| `[ -f "$archivo" ]` | Existe y es un archivo regular |
| `[ -d "$dir" ]` | Existe y es un directorio |
| `[ -r "$archivo" ]` | Existe y tienes permiso de lectura |
| `[ -w "$archivo" ]` | Existe y tienes permiso de escritura |
| `[ -s "$archivo" ]` | Existe y NO está vacío (tamaño > 0) |
| `[ -z "$var" ]` | La variable está vacía |
| `[ -n "$var" ]` | La variable NO está vacía |

## 4. Usar códigos de salida con significado, no solo `exit 1` para todo

Convención razonable (no es un estándar universal impuesto por Unix, pero es una práctica común):

```bash
exit 0   # éxito
exit 1   # error genérico / uso incorrecto de argumentos
exit 2   # archivo o recurso no encontrado
exit 3+  # códigos específicos del dominio del script, documentados en un comentario al inicio
```

Diferenciar los códigos permite que quien invoque tu script desde otro script pueda reaccionar distinto según qué falló:

```bash
./validar.sh archivo dir
case $? in
  0) echo "todo bien" ;;
  1) echo "uso incorrecto, revisa los argumentos" ;;
  2) echo "falta un archivo o directorio" ;;
esac
```

## 5. Limpiar recursos temporales aunque el script falle a mitad de camino — `trap`

```bash
#!/usr/bin/env bash
set -euo pipefail

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

echo "datos temporales" > "$TMPFILE"
# ... resto del script, incluso si falla aquí abajo ...
cat "$TMPFILE"
```

`trap 'comando' EXIT` registra un comando que se ejecuta siempre al terminar el script, sin importar si terminó con éxito, con error, o fue interrumpido con `Ctrl+C` — evita dejar archivos temporales huérfanos cuando un script falla a la mitad.

## 6. Validar el número de columnas o formato de un dato antes de procesarlo con awk

Un error común es asumir que todas las líneas de un archivo tienen el mismo número de campos. Verificarlo explícitamente evita resultados silenciosamente incorrectos:

```bash
awk -F',' '
NF != 5 { print "Linea " NR " tiene " NF " campos, se esperaban 5" > "/dev/stderr"; next }
{ print }  # procesamiento normal si la validacion paso
' archivo.csv
```

`next` salta al resto del procesamiento para esa línea sin abortar todo el script — reporta el problema y sigue con la siguiente línea, en vez de fallar por completo o (peor) procesar datos mal alineados sin avisar.
