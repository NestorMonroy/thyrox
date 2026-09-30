# Probar un script antes de usarlo con datos reales

Guía abstracta — el objetivo es detectar errores de sintaxis o de lógica con datos de juguete, antes de correr algo contra un corpus grande o un archivo importante que no quieres corromper.

## 1. Verificar la sintaxis sin ejecutar nada — `bash -n`

```bash
bash -n script.sh
```

Esto revisa que el script sea sintácticamente válido (paréntesis, `if`/`fi`, comillas balanceadas) sin correr ni una sola línea. Es la primera línea de defensa, y no tiene efectos secundarios — seguro de correr siempre.

Probado con un script con un `if` al que le falta `then`:
```
roto.sh: line 4: syntax error near unexpected token `fi'
roto.sh: line 4: `fi'
```

Esto te dice exactamente en qué línea está el problema, antes de que el script llegue a tocar ningún archivo real.

## 2. Crear datos de prueba mínimos con `printf`/`echo`, sin necesitar un archivo real

```bash
# Probar un one-liner con una sola línea de entrada, sin crear un archivo
printf "campo1,campo2,campo3\n" | awk -F',' '{print $2}'

# Probar con múltiples líneas usando un "here-doc"
awk '{print NR, $0}' <<'EOF'
primera linea
segunda linea
EOF
```

El here-doc (`<<'EOF' ... EOF`) es preferible a crear un archivo temporal cuando el caso de prueba es corto — no deja archivos residuales y se lee en el mismo lugar donde está el comando, lo cual hace más fácil entender qué se está probando.

## 3. Casos borde que vale la pena probar SIEMPRE antes de confiar en un script

| Caso borde | Cómo probarlo | Qué revela |
|---|---|---|
| Archivo vacío | `printf "" \| tu_comando` | Si el script asume que siempre hay al menos una línea (puede fallar con `division by zero` si calcula un promedio) |
| Una sola línea sin salto de línea final | `printf "dato_sin_salto" \| tu_comando` | Si el script depende de que cada línea termine en `\n` (algunas herramientas ignoran la última línea si no lo tiene) |
| Campos vacíos en medio de una fila | `printf "a,b,,d\n" \| awk -F',' '{print NF}'` | Si tu lógica de conteo de columnas se rompe cuando un campo está vacío pero presente (aquí `NF` sigue siendo 4, correcto) |
| Caracteres especiales en los datos (comillas, backslashes, espacios) | `printf 'linea con "comillas" y \\ backslash\n' \| tu_comando` | Si tu regex o tu delimitador se confunde con caracteres que también son sintaxis de shell o de awk/sed |
| Archivo muy grande (simulado) | `yes "linea de prueba" \| head -n 100000 > prueba_grande.txt` | Si el script escala razonablemente o si un enfoque ingenuo (ej. un `grep` por elemento dentro de un loop) se vuelve impráctico |

## 4. Leer los mensajes de error más comunes y qué significan

| Mensaje | Herramienta | Causa típica |
|---|---|---|
| `syntax error near unexpected token` | bash | Falta cerrar un `if`/`then`/`fi`, un `do`/`done`, o una comilla |
| `command not found` | bash | Typo en el nombre del comando, o falta instalar la herramienta |
| `No such file or directory` | cualquiera | Ruta incorrecta, o el archivo se movió/borró entre que lo listaste y lo usaste |
| `awk: syntax error at source line N` | awk | Comillas simples/dobles mezcladas incorrectamente (ver la guía de awk) |
| `division by zero` | awk | Falta validar un denominador antes de dividir (frecuente en promedios, IDF, tasas) |
| `Argument list too long` | find/xargs con muchos archivos | Se alcanzó `ARG_MAX`; usar `-exec ... +` o `xargs` en vez de expandir un glob directamente |
| `Broken pipe` | cualquier comando en una tubería | El siguiente comando de la tubería cerró su entrada antes de tiempo (común al usar `head` al final de una tubería larga) — casi siempre inofensivo |

## 5. Comparar la salida esperada contra la real, de forma reproducible

```bash
# Generar la salida real
tu_script.sh datos_de_prueba.txt > salida_real.txt

# Compararla contra lo que esperabas manualmente
diff esperado.txt salida_real.txt && echo "coincide" || echo "hay diferencias"
```

Guardar el archivo `esperado.txt` una vez que verificaste manualmente que la salida es correcta convierte esa comprobación en una prueba repetible — la próxima vez que modifiques el script, basta con volver a correr el `diff` para confirmar que no rompiste nada.

## 6. Herramientas externas que ayudan (mención, no reemplazo de lo anterior)

- **`shellcheck`** (si está instalado): analiza scripts bash y señala errores comunes y anti-patrones (variables sin comillas, comparaciones ambiguas) que `bash -n` no detecta porque son sintácticamente válidos pero propensos a fallar en casos borde.
- **`set -x`** al inicio de un script (o `bash -x script.sh`): imprime cada comando antes de ejecutarlo, con sus variables ya expandidas — útil para ver exactamente qué valor tenía una variable en el momento del fallo, en vez de adivinar.
