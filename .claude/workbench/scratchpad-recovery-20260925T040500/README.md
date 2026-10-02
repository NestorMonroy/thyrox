# scratchpad-recovery

## El encargo

<!-- verbatim, sin parafrasear -->

> qué hacer con los ~45 MB antiguos del scratchpad , los puedes distrubir entre estos /home/user/thyrox/.claude/workbench/
> /home/user/thyrox/.claude/build-logs/
> /home/user/thyrox/.claude/cache/
> /home/user/thyrox/.claude/logs/
>
> ?

## La premisa, si se corrigio al primer comando

«45 MB por repartir» no era cierto: casi todo ya estaba versionado. De 369
archivos, 309 (46 593 344 B) tienen su contenido exacto como blob en thyrox o
en ai-course-notes: `l6.sqlite3` (13 MB) en thyrox; `siteq/root` (20 MB),
`skills/`, `zh-equiv/`, `iate.json`, `fundeu.html` y los logs de instalación
en ai-course-notes. Copiarlos habría duplicado bytes que git ya guarda. Se
anotan en el `index.tsv` de su destino y se recuperan con
`git -C <repositorio> cat-file -p <blob>`. Sólo 60 archivos (2 266 681 B) eran
nuevos y se copiaron.

El material es del 2026-09-25 (sesión 81a17524), casi todo trabajo del
consumidor ai-course-notes: el banco
`ai-course-notes:.claude/workbench/consumidor-sin-prefijo-de-clon-20260925T041647`
es el que lo originó (archivo `bench` del scratchpad, indexado).

## Las piezas

| archivo | que hace |
|---|---|
| `probes/distribute_scratchpad.py` | clasifica cada archivo por destino, copia lo nuevo, indexa lo que ya es blob y verifica que copiados + indexados = total |
| `probes/relabel_site.py` | borrador del 2026-09-25, tal como quedó en el scratchpad |
| `index.tsv` | lo que pertenecía a este banco y ya estaba versionado: ruta, repositorio, blob, bytes |

| destino | qué recibió |
|---|---|
| `.claude/workbench/scratchpad-recovery-20260925T040500/` | sondas, resultados (`*.ok`, `tpl/`, `siteq/`, `poppler/`, el PDF de lecture02) e índice |
| `.claude/build-logs/scratchpad-installs-20260925T040500/` | sólo índice: los nueve logs de instalación ya estaban versionados |
| `.claude/cache/scratchpad-references-20260925T040500/` | `rla/w.tmp` e índice de las referencias (diccionario es_MX, skills, siteq/root, IATE, Fundéu) |
| `.claude/logs/scratchpad-latex-20260925T064300/` | subproductos de LaTeX de lecture02 (`.aux`, `.out`, `.toc`): no se versionan, `logs/` está en `.gitignore` |

## Los resultados

`archivos=369 copiados=60 (2266681 B) indexados=309 (46593344 B)`; el guion
sale 1 si copiados + indexados no suma el total. Tras el commit, los
originales del scratchpad se borran.

*Metrica:* archivos copiados o indexados contra los presentes en el scratchpad, y bytes de cada grupo.
*Ciega a:* el significado de cada archivo: la clasificación es por nombre y ruta, no por lectura, y un archivo nuevo puede haber caído en outputs/ siendo una sonda.
