# `bash-awk-probabilidad` — procedencia y para qué sirve

Creado: 2026-09-16T19:45:00
Origen: el ejecutor lo entregó dos veces en la sesión
`168b0fdf-bfe4-590b-b6c0-b6be124c124a`, como
`probability-bash-awk.7z` (67 444 bytes, 32 archivos, 224 066 bytes al
descomprimir), tras señalar que el detector de recorrido sin cota *«solo
considera grep»*.

## Qué es

Material de autoría propia del ejecutor sobre la línea de comandos: árbol de
decisión `grep`/`sed`/`awk`/`find`, referencias de banderas por herramienta,
POSIX contra GNU, BRE contra ERE, `jq`, diagnóstico de tipo de archivo, y una
serie de documentos que aplican probabilidad al análisis de texto —TF-IDF,
binomial, normal, hipergeométrica, multinomial, verosimilitud máxima,
correlación de Pearson, divergencia KL, muestreo con y sin reemplazo— todos
con su implementación en `awk` y `bash`.

## Por qué vive aquí y no en un banco del consumidor

Es **apoyo a la construcción**, no producto ni estado: el mismo papel que los
otros cinco corpus de este directorio, y el que `odoo-tools` cumple para el
producto de kaupamex. Un banco de `.claude/workbench/` documenta *cómo se
ejecutó un trabajo*; esto es material de consulta que sobrevive al trabajo que
lo motivó.

## Lo que ya corrigió, medido

`01-guia-decision-busqueda-texto.md` nombra `rg` como la opción más rápida en
árboles grandes porque *«ignora .git por defecto»*.
`src/hooks/detect_unbounded_traversal.py` lo tenía en su bloque `Ciega a:` —
declarado fuera de alcance **sin haberlo medido**. Medido contra este árbol:
`rg --files` visita **14 067** archivos y `rg --files --no-ignore --hidden`
visita **50 190**. La cota es real y automática, así que `rg` pasó de ceguera
a descuento, con su retirada ante `--no-ignore` (`thyrox@f9397dbe`).

## Derechos

Material del ejecutor, entregado para uso del proyecto. No declara licencia y
la ausencia no se rellena por conveniencia — mismo criterio que `ccb`.
