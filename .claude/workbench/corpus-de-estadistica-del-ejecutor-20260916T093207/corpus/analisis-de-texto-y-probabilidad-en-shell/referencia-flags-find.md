# Referencia completa de flags de find

Hoja standalone que sistematiza las opciones de `find` que aparecieron sueltas en los one-liners anteriores.

## Filtrado por nombre

| Flag | Qué hace |
|---|---|
| `-name "patron"` | Coincide por nombre de archivo (glob, sensible a mayúsculas) |
| `-iname "patron"` | Igual que `-name` pero sin distinguir mayúsculas/minúsculas |
| `-path "patron"` | Coincide contra la RUTA completa, no solo el nombre del archivo |
| `-regex "patron"` | Coincide la ruta completa contra una expresión regular (por defecto sabor Emacs, no BRE/ERE — usar `-regextype posix-extended` para ERE) |

Probado:
```bash
find testdir -iname "*.txt"
```
Salida real: matchea tanto `a.txt` como `D.TXT` (mayúsculas), algo que `-name "*.txt"` no haría.

## Filtrado por tipo

| Flag | Qué selecciona |
|---|---|
| `-type f` | Solo archivos regulares |
| `-type d` | Solo directorios |
| `-type l` | Solo symlinks |
| `-type p` | Named pipes (FIFOs) |
| `-type s` | Sockets |

## Filtrado por tamaño

| Flag | Qué hace |
|---|---|
| `-size +1M` | Archivos MAYORES a 1 megabyte |
| `-size -1M` | Archivos MENORES a 1 megabyte |
| `-size 1M` | Archivos de EXACTAMENTE 1 megabyte |
| `-size +500c` | Mayores a 500 bytes (`c` = bytes) |
| `-size +10k` | Mayores a 10 kilobytes |

Probado:
```bash
find testdir -type f -size +1M
```
Salida real: solo el archivo de 2MB creado para la prueba, ninguno de los archivos vacíos.

## Filtrado por fecha

| Flag | Qué hace |
|---|---|
| `-mtime -7` | Modificado en los últimos 7 días |
| `-mtime +7` | Modificado hace MÁS de 7 días |
| `-mmin -60` | Modificado en los últimos 60 minutos |
| `-newer archivo_referencia` | Modificado más recientemente que `archivo_referencia` |
| `-atime` / `-ctime` | Igual que `-mtime` pero por fecha de acceso / cambio de metadatos, respectivamente |

Probado:
```bash
touch testdir/nuevo.txt
find testdir -newer testdir/a.txt
```
Salida real: incluye `nuevo.txt` (creado después) y excluye `a.txt` y los demás archivos previos.

## Filtrado por permisos

| Flag | Qué hace |
|---|---|
| `-perm 644` | Permisos EXACTAMENTE 644 |
| `-perm -644` | Al menos esos bits activados (pueden tener más permisos) |
| `-perm /644` | Al menos UNO de esos bits activado (OR en vez de AND) |

Probado:
```bash
chmod 644 testdir/a.txt
find testdir -maxdepth 1 -type f -perm 644
```
Salida real: solo el archivo con permisos exactos 644, excluyendo el que tenía 755.

## Control de profundidad del recorrido

| Flag | Qué hace |
|---|---|
| `-maxdepth N` | No desciende más de N niveles desde el punto de partida |
| `-mindepth N` | Ignora resultados a menos de N niveles de profundidad |

Probado:
```bash
find testdir -maxdepth 1 -type f    # solo archivos directamente en testdir/
find testdir -mindepth 2 -type f    # solo archivos dentro de subcarpetas, no en testdir/ directamente
```

**Por qué el orden de los flags importa con `-maxdepth`:** debe ir ANTES de las condiciones de filtrado (`-name`, `-type`) para evitar advertencias en algunas implementaciones — es una opción "global" que afecta cómo se recorre el árbol, no una condición sobre cada archivo.

## Combinaciones lógicas

| Operador | Significado |
|---|---|
| (nada, dos condiciones seguidas) | AND implícito |
| `-and` | AND explícito (rara vez necesario, el implícito ya basta) |
| `-o` / `-or` | OR |
| `-not` / `!` | Negación |
| `\( ... \)` | Agrupación — necesaria para que `-o`/`-not` apliquen como esperas |

Probado:
```bash
find . -maxdepth 1 -type f \( -name "*.py" -o -name "*.sh" \) -not -name "excluir.sh"
```

**Por qué agrupar con `\( \)` es obligatorio aquí:** sin paréntesis, `find` evalúa de izquierda a derecha con precedencia de AND sobre OR, así que `-type f -name "*.py" -o -name "*.sh"` se leería como `(-type f -name "*.py") -o (-name "*.sh")` — el segundo grupo ya NO exige que sea un archivo, solo que el nombre matchee. Agrupar explícitamente evita ese error silencioso.

## Acciones sobre lo encontrado

| Flag | Qué hace |
|---|---|
| `-print` | Imprime la ruta (comportamiento por defecto, casi nunca hace falta escribirlo) |
| `-print0` | Igual, pero separado por bytes nulos en vez de saltos de línea — seguro con nombres que tienen espacios (extensión GNU, combinar con `xargs -0`) |
| `-delete` | Borra cada archivo encontrado directamente (¡irreversible! probar antes sin `-delete`) |
| `-exec comando {} \;` | Ejecuta `comando` una vez POR CADA archivo encontrado |
| `-exec comando {} +` | Ejecuta `comando` UNA VEZ, agrupando todos los archivos como argumentos (más eficiente, ver la guía de decisión original) |
| `-ok comando {} \;` | Igual que `-exec` pero pide confirmación antes de cada ejecución |

## Errores comunes

| Síntoma | Causa típica |
|---|---|
| `find` no encuentra nada aunque el archivo existe | Olvidaste que `-name` es sensible a mayúsculas — probar con `-iname` |
| `find: paths must precede expression` | Pusiste una condición (`-name`, `-type`) ANTES de la ruta de búsqueda; la ruta siempre va primero |
| Un `-o` no funciona como esperabas | Falta agrupar con `\( ... \)` — ver la sección de combinaciones lógicas |
| `-exec` corre pero parece muy lento con miles de archivos | Estás usando `\;` (una invocación por archivo) en vez de `+` (agrupado) |
