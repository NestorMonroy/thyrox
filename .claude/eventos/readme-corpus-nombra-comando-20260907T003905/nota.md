# Tarea #179 — el README del corpus nombra el comando, no la tabla

Fecha (`date -u`): 2026-09-07T00:37:02

## Lo medido antes de tocar nada

`_references/claude-code-bin/README.md` dibujaba un árbol a mano con seis
builds. El directorio real tenía, al abrir la tarea, ocho subdirectorios con
forma de versión (más `2.1.246-nombrado`, vista derivada) — y mientras se
escribía este guion apareció una NOVENA build (`2.1.263`, extraída
2026-09-06T06:31:36), confirmando en vivo el defecto que la tarea describe: el
árbol crece más rápido de lo que cualquiera se acuerda de actualizar el README.

También era falso el detalle de `2.1.258`: el README decía "SÓLO
claude_strings.txt"; el directorio real trae `bunfs-root/`, `MANIFEST.tsv`,
`claude_strings.txt` y `README.md` — le falta únicamente `src/` (el árbol de
fuentes reconstruido). Mismo patrón en `2.1.259`, `2.1.261` y `2.1.263`, que ni
siquiera se mencionaban.

## El arreglo — NO se corrigieron las cifras

Corregir la tabla a mano habría reproducido el defecto la semana que viene sin
que nadie edite el archivo (H-DOCS-139: "actualizar el número trata el
síntoma y garantiza la reincidencia"). El arreglo es que el README nombre el
comando que publica el árbol — igual que ya hace con el tamaño del volcado de
cada build individual (`wc` sobre `claude_strings.txt`, citado en cada
`README.md` de build en vez de transcrito en el README raíz).

Se escribió `src/corpus/list_corpus_builds.py` porque no existía ningún
comando (Python o TypeScript) que enumerara el árbol de builds y lo que cada
una trae — lo más cercano, `src/gates/check_corpus_al_dia.py` y
`src/packages/binary/bin/binary.ts freshness`, comparan el corpus contra UN
ejecutable vivo, no listan lo que ya hay.

## Comandos ejecutados

```bash
python3 src/corpus/list_corpus_builds.py
python3 tests/corpus/test_list_corpus_builds.py
```

Salidas en `salida_list_corpus_builds.txt` y
`salida_test_list_corpus_builds.txt` de este mismo directorio.

## Métrica / Ciega a (la del propio guion, citada en su docstring)

- **Métrica:** existencia (`Path.exists()`) de los cinco marcadores conocidos
  (`bunfs-root`, `src`, `MANIFEST.tsv`, `claude_strings.txt`, `README.md`)
  dentro de cada directorio cuyo nombre empieza por `X.Y.Z`.
- **Ciega a:** si el contenido del marcador es fiel a esa versión (la
  fidelidad la garantiza el guard de re-extracción, otro instrumento); a un
  directorio sin forma de versión; y a un marcador que el guion no conozca.

## Control de anulación (bloque 4 de la suite)

Se reemplaza `detect_markers` por una función que no mira el disco y devuelve
siempre los cinco marcadores. Con el mecanismo anulado, un build de "sólo
volcado" (`claude_strings.txt` + `README.md`) aparece con los cinco
marcadores — la distinción que el bloque 1 medía desaparece, y la aserción
que antes era verdadera ahora es falsa. Se restaura y se confirma que la
distinción vuelve. 18 de 18 aserciones pasan (`salida_test_list_corpus_builds.txt`).
