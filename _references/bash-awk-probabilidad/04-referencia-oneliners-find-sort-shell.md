# Referencia de one-liners: find, xargs, sort/uniq/cut, y productividad de shell

Extraído y generalizado del documento anexado — se omiten ejemplos específicos de bioinformática (fastqc, samtools, seqtk).

## find, xargs y GNU parallel

```bash
# Buscar archivos por extensión, recursivamente
find . -name "*.ext"

# Borrar archivos que matchean un patrón (revisa la lista ANTES de borrar)
find . -name "*.tmp" | xargs rm

# Encontrar el archivo más grande de un directorio
find . -type f -printf '%s %p\n' | sort -nr | head -1 | cut -d' ' -f2-

# Contar líneas totales entre todos los archivos con cierta extensión
find . -type f -name '*.txt' -exec wc -l {} \; | awk '{total += $1} END {print total}'

# Encontrar directorios que contienen archivos .log y comprimirlos
find . -type f -name "*.log" -printf "%h\0" | sort -uz | xargs -0 tar -czvf logs.tar.gz

# Renombrar todos los .txt a .bak
find . -name "*.txt" -exec sh -c 'mv "$1" "${1%.txt}.bak"' _ {} \;

# Archivos grandes (más de 500MB)
find . -type f -size +500M

# Buscar archivos que contienen cierto texto (-l solo nombres, -i sin distinguir mayúsc., -r recursivo)
grep -lir "texto a buscar" .

# Procesar archivos en paralelo (requiere GNU parallel)
find . -name "*.csv" | parallel -j 4 "procesar_csv.sh {}"

# Ejecutar en paralelo mostrando solo los comandos, sin correrlos (dry-run)
find . -name "*.dat" | parallel --dry-run 'mi_comando {}'

# Checksums de un directorio de archivos en paralelo
parallel md5sum ::: * > checksums.md5

# Validar checksums en paralelo
cat checksums.md5 | parallel --pipe -N1 md5sum -c
```

## sort, uniq, cut, comm, join

```bash
# Numerar cada línea de un archivo
cat -n archivo.txt

# Contar líneas únicas
sort -u archivo.txt | wc -l

# Líneas compartidas entre dos archivos (deben estar ordenados y sin duplicados)
sort -u file1 > a
sort -u file2 > b
comm -12 a b

# Ordenar numéricamente por una columna (con soporte de notación científica: -g)
sort -gk9 archivo.txt

# Strings más comunes en la columna 2
cut -f2 archivo.txt | sort | uniq -c | sort -k1nr | head

# Elegir N líneas aleatorias de un archivo
shuf archivo.txt | head -n 10

# Extraer columnas específicas (delimitador por defecto: tab)
cut -f1,3,5 archivo.txt > salida.txt

# Extraer con delimitador distinto (ej. coma)
cut -d',' -f1,2 archivo.csv

# Excluir una columna en vez de seleccionarla
cut -f5 --complement archivo.txt

# Ordenar por múltiples columnas (numérico en col 2, luego col 4)
sort -n -k2,2 -k4,4 archivo.txt > salida.txt

# Líneas únicas de un archivo YA ordenado
uniq -u archivo_ordenado.txt

# Líneas duplicadas de un archivo YA ordenado
uniq -d archivo_ordenado.txt

# Unir dos archivos por la columna 1 (ambos deben estar ordenados por esa columna)
join -1 1 -2 1 file1.txt file2.txt

# Combinar dos archivos horizontalmente (mismo número de filas)
paste file1.txt file2.txt > combinado.txt

# Concatenar varios archivos en uno
cat file1 file2 file3 > combinado.txt
```

## Operaciones de conjuntos entre dos listas (patrón general)

```bash
grep 'patron' archivoA > listaA
grep 'patron' archivoB > listaB

cat listaA listaB > tmp
sort tmp > tmp_ordenado

uniq -u tmp_ordenado > solo_en_una      # A - B  U  B - A (diferencia simétrica)
uniq -d tmp_ordenado > interseccion     # A ∩ B

cat interseccion solo_en_una > union    # A ∪ B

# A - B específicamente:
cat listaA interseccion | sort | uniq -u > solo_en_A
# B - A específicamente:
cat listaB interseccion | sort | uniq -u > solo_en_B
```

## Productividad de shell (para .bashrc / .zshrc)

```bash
# Prompt legible: usuario@host:/ruta/actual/:$
export PS1="\u@\h:\w\\$ "

# Navegar hacia arriba sin escribir cd ../../..
alias ..='cd ..'
alias ...='cd ../../'
alias ....='cd ../../../'

# Confirmar antes de mover/copiar/borrar (evita accidentes)
alias mv="mv -i"
alias cp="cp -i"
alias rm="rm -i"

# Función para crear un directorio y entrar a él en un solo paso
mcd() { mkdir -p "$1" && cd "$1"; }

# Función de extracción universal según la extensión del archivo
extract() {
  if [ -f "$1" ]; then
    case "$1" in
      *.tar.bz2) tar xvjf "$1" ;;
      *.tar.gz)  tar xvzf "$1" ;;
      *.tar.xz)  tar Jxvf "$1" ;;
      *.bz2)     bunzip2 "$1" ;;
      *.gz)      gunzip "$1" ;;
      *.tar)     tar xvf "$1" ;;
      *.zip)     unzip "$1" ;;
      *.7z)      7z x "$1" ;;
      *) echo "No sé cómo extraer '$1'..." ;;
    esac
  else
    echo "'$1' no es un archivo válido"
  fi
}

# Buscar texto en cualquier archivo (uso: ft "mitexto" "*.txt")
ft() { find . -name "$2" -exec grep -il "$1" {} \; ; }

# Refrescar la configuración de shell sin cerrar sesión
alias refresh="source ~/.bashrc"

# Ver el $PATH en formato legible, una entrada por línea
alias showpath='echo $PATH | tr ":" "\n" | nl'
```

## Atajos de terminal útiles (no son comandos, son teclas/sintaxis del shell)

| Atajo / sintaxis | Qué hace |
|---|---|
| `sudo !!` | Repite el último comando con `sudo` adelante |
| `!!` | Repite el último comando completo |
| `!*` | Reutiliza todos los argumentos del comando anterior |
| `!:-` | Inserta el comando anterior sin su último argumento |
| `Alt + .` (o `Esc .`) | Inserta el último argumento del comando anterior |
| `Ctrl+u` ... `Ctrl+y` | Corta el comando que estabas escribiendo, lo puedes recuperar después con `Ctrl+y` |
| `fc` | Abre el editor configurado para escribir un comando largo/complejo |
| `(cd /tmp && ls)` | Ejecuta en un subshell — vuelve al directorio original al terminar |
| `time read` | Cronómetro simple: cuenta el tiempo hasta que presionas Enter |
