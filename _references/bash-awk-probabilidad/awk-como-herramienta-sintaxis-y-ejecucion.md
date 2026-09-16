# awk como herramienta: cómo invocarlo y parametrizarlo correctamente

Guía abstracta sobre la forma correcta de ejecutar `awk`, no sobre qué hacer con él (eso está en las referencias de one-liners entregadas antes). El error más común no es de lógica, sino de cómo se le pasa el programa y los datos.

## 1. Las tres formas de darle un programa a awk

```bash
# 1) Programa inline, entre comillas simples — la forma más común para one-liners
awk '{ print $1 }' archivo.txt

# 2) Programa guardado en un archivo .awk, invocado con -f
awk -f programa.awk archivo.txt

# 3) Archivo .awk ejecutable por sí mismo, con su propio shebang
#    (requiere chmod +x, ver la guía de ejecución de scripts)
./programa.awk archivo.txt
```

Para la opción 3, el archivo debe empezar así:
```awk
#!/usr/bin/awk -f
{ print $1 }
```

## 2. Comillas simples vs dobles — la fuente más común de errores

```bash
# CORRECTO: comillas simples, awk ve $1 y lo interpreta como su propio campo
awk '{ print $1 }' archivo.txt

# INCORRECTO: comillas dobles, el SHELL intenta expandir $1 ANTES de que awk lo vea
awk "{ print $1 }" archivo.txt
```

Con comillas dobles, si `$1` no está definido en tu shell, se sustituye por una cadena vacía y el programa awk que realmente se ejecuta es `{ print }` — sin error visible, pero con resultado incorrecto. **Regla:** el programa de awk casi siempre va entre comillas simples, salvo que necesites que el shell sustituya algo *a propósito* antes de que awk lo vea (raro, y mejor resuelto con `-v`, ver más abajo).

## 3. Pasar valores desde bash hacia awk — la forma correcta es `-v`

```bash
awk -v etiqueta="PREFIJO" '{ print etiqueta": "$0 }' archivo.txt
```

Probado, salida real:
```
PREFIJO: linea de prueba
```

`-v nombre=valor` define una variable awk *antes* de que empiece a procesar el `BEGIN`. Es la forma segura de inyectar un valor de shell (una variable, el resultado de un comando) sin depender de que las comillas del programa se rompan.

```bash
# Ejemplo: pasar un umbral calculado dinámicamente en bash
umbral=$(calcular_umbral.sh)
awk -v u="$umbral" '$3 > u { print }' archivo.txt
```

**Qué NO hacer:** interpolar directamente la variable de shell dentro de las comillas simples del programa awk (`awk '{ print $'"$var"' }'`) — funciona, pero es frágil y difícil de leer; `-v` es siempre preferible.

## 4. Múltiples archivos de programa combinados

```bash
awk -f funciones_comunes.awk -f programa_principal.awk archivo.txt
```

Útil cuando tienes un archivo `.awk` con funciones reutilizables (definidas con `function nombre(args) {...}`) que quieres compartir entre varios programas awk distintos, sin copiar y pegar el código de la función en cada uno.

## 5. Definir y llamar tus propias funciones dentro de un programa awk

```bash
awk 'function doble(x) { return x*2 } { print doble($1) }' archivo.txt
```

Probado con entrada `3`, `5`, `8` → salida real: `6`, `10`, `16`.

**Convención para variables locales dentro de una función:** awk no tiene declaración de variables locales explícita — se simula dejando espacios extra en la lista de parámetros después de los parámetros reales:

```awk
function choose(n, r,    i, res) {
  # n y r son parámetros reales; i y res son "locales" por convención
  res = 1
  for (i = 0; i < r; i++) res = res * (n - i) / (i + 1)
  return res
}
```

Sin ese espacio y esa convención, `i` y `res` serían variables globales que podrían chocar con otras partes del programa — es la forma estándar (no impuesta por el lenguaje, sino por convención de la comunidad) de emular alcance local en awk.

## 6. Separador de campos: definirlo bien desde el principio

```bash
# Opción A: como flag de línea de comandos
awk -F',' '{ print $2 }' archivo.csv

# Opción B: dentro del propio programa, en el bloque BEGIN
awk 'BEGIN { FS="," } { print $2 }' archivo.csv
```

Ambas son equivalentes para el separador de *entrada*. Si además necesitas cambiar el separador de *salida* (por ejemplo, leer con comas pero escribir con tabs), se hace con `OFS`, y hay que reasignar `$1` (o cualquier campo) al menos una vez para que awk reconstruya la línea con el nuevo separador:

```bash
awk 'BEGIN { FS=","; OFS="\t" } { $1=$1; print }' archivo.csv
```

El `$1=$1` (aparentemente inútil) es necesario porque awk solo reconstruye `$0` usando `OFS` cuando detecta que algún campo fue modificado — sin esa línea, `print` seguiría usando el separador original de la línea de entrada.

## 7. Errores comunes al invocar awk y qué significan

| Mensaje de error | Causa típica |
|---|---|
| `awk: syntax error at source line 1` | Comillas mal cerradas, o usaste comillas dobles y el shell rompió el programa a la mitad |
| `awk: can't open file archivo.txt` | El nombre del archivo tiene un typo, o quedó interpretado como parte del programa por falta de comillas de cierre |
| El programa corre pero no imprime nada | Verifica el separador de campos (`-F`) — si es incorrecto, `$1`, `$2`, etc. no apuntan a lo que crees |
| `division by zero` dentro de una función | Falta validar el denominador antes de dividir, especialmente en fórmulas como IDF (`log(N/df)`) cuando `df` puede ser 0 |
