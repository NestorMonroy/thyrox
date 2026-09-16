# Ejecutar scripts Unix correctamente: shebang, permisos y argumentos

Guía abstracta — aplica a cualquier script bash/awk/sed que escribas o descargues, no a uno en particular. Resuelve el problema más común de "por qué no me corre esto" antes de tocar la lógica del script.

## 1. La línea shebang: qué es y cuáles usar

La primera línea de un script (`#!/algo`) le dice al sistema qué intérprete usar cuando lo ejecutas como `./script`. Si no la pones, o el script se invoca con `bash script.sh`, se ignora — el shebang solo importa cuando ejecutas el archivo directamente.

| Shebang | Cuándo usarlo |
|---|---|
| `#!/bin/bash` | El script usa sintaxis específica de bash (arreglos, `[[ ]]`, `local`) y sabes que `/bin/bash` existe en esa ruta |
| `#!/usr/bin/env bash` | Igual que el anterior, pero más portable — busca `bash` en el `PATH` en vez de asumir la ruta exacta. Preferido en scripts que compartes con otros |
| `#!/bin/sh` | El script usa solo sintaxis POSIX pura (ver la guía de decisión POSIX vs GNU) y debe correr en sistemas mínimos |
| `#!/usr/bin/awk -f` | El archivo completo es un programa awk, no un script bash que llama a awk |

## 2. Permisos de ejecución

Un script no se puede correr como `./script.sh` hasta que tenga permiso de ejecución:

```bash
chmod +x script.sh
./script.sh
```

Si ves `Permission denied`, es casi siempre esto. Verificarlo antes de asumir un error de sintaxis:

```bash
ls -l script.sh   # busca la 'x' en los permisos, ej: -rwxr-xr-x
```

## 3. Tres formas de correr el mismo script — no son intercambiables

```bash
./script.sh       # usa el shebang del archivo; requiere permiso de ejecución
bash script.sh     # fuerza bash, ignora el shebang; NO requiere permiso de ejecución
sh script.sh       # fuerza sh (puede ser dash, no bash — rompe sintaxis específica de bash)
source script.sh   # ejecuta en el shell ACTUAL, no en un subproceso — variables y cd persisten después
```

**Diferencia importante de `source` (o su alias `.`):** si el script hace `cd otra_carpeta`, con `./script.sh` o `bash script.sh` tu terminal sigue en la carpeta original al terminar (el `cd` solo afectó al subproceso). Con `source script.sh`, el `cd` sí persiste en tu sesión actual — es la técnica que usan los scripts que modifican variables de entorno o alias para tu shell (como `.bashrc`).

## 4. Pasar y leer argumentos correctamente

```bash
#!/usr/bin/env bash
echo "Cantidad de argumentos: $#"
echo "Primer argumento: $1"
echo "Todos los argumentos como una sola palabra: $*"
echo "Todos los argumentos preservando separación: $@"
echo "Nombre del propio script: $0"
```

Real, probado:
```
$ ./demo.sh hola mundo
Cantidad de argumentos: 2
Primer argumento: hola
Todos: hola mundo
```

**`$*` vs `$@` — la diferencia que importa cuando hay espacios:** si un argumento tiene espacios (`"nombre con espacios"`), `"$@"` (entre comillas, con arroba) preserva cada argumento como una unidad separada; `"$*"` los junta todos en un solo string. Para reenviar argumentos a otro comando tal como llegaron, siempre usa `"$@"`.

## 5. Verificar si un script terminó bien o mal

Todo comando en Unix devuelve un código de salida: `0` significa éxito, cualquier otro número indica algún tipo de fallo (la convención específica del número depende del programa).

```bash
./script.sh
echo "Código de salida: $?"
```

Esto es la base de encadenar comandos según si el anterior tuvo éxito:

```bash
./script.sh && echo "salió bien" || echo "salió mal"
```

## 6. Dónde vive un script y por qué `comando` a veces no funciona igual que `./comando`

Si escribes solo el nombre del script (`miscript.sh`) sin `./` y sin que esté en tu `PATH`, el shell no lo va a encontrar — por diseño, el directorio actual no está en el `PATH` por seguridad. Opciones:

```bash
./miscript.sh                          # ruta relativa explícita, siempre funciona si estás en esa carpeta
/ruta/completa/miscript.sh             # ruta absoluta, funciona desde cualquier carpeta
cp miscript.sh ~/bin/ && miscript.sh   # si ~/bin/ está en tu $PATH, ya puedes invocarlo por nombre
```
