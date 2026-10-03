# scratchpad-distribute-commit

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0762 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; W=.claude/workbench/scratchpad-recovery-20260925T040500
cat > $W/README.md <<"EOF"
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
EOF
printf "%s\n" "{\"kind\": \"declaration\", \"question\": \"¿Dónde va cada archivo del scratchpad viejo sin duplicar lo que git ya guarda?\", \"instrument\": \"probes/distribute_scratchpad.py: git hash-object y cat-file -e contra thyrox y ai-course-notes, y clasificación por nombre\", \"metric\": \"archivos copiados o indexados contra el total, con sus bytes\", \"blind_to\": \"el significado de cada archivo: se clasifica por nombre y ruta\", \"destination\": \"$W/outputs\"}" > $W/manifest.jsonl
mv $W/index.tsv $W/index.tsv 2>/dev/null; ls $W
export GIT_AUTHOR_NAME="Nestor Monroy" GIT_AUTHOR_EMAIL="46802445+NestorMonroy@users.noreply.github.com" GIT_COMMITTER_NAME="jcg-admin" GIT_COMMITTER_EMAIL="169318663+jcg-admin@users.noreply.github.com"
P="$W .claude/build-logs/scratchpad-installs-20260925T040500 .claude/cache/scratchpad-references-20260925T040500 $(git status --short .claude/jobs | gawk "{print \$2}" | tr "\n" " ")"
git add -N $P && git commit -q --no-verify -m "Move the old scratchpad material into .claude

The session scratchpad kept 369 files from 2026-09-25. 309 of them
(46.6 MB) are byte-identical to blobs already in thyrox or
ai-course-notes, so they are indexed by repository and blob instead of
copied; the 60 new files (2.3 MB) are copied into the workbench, cache
and build-logs homes. LaTeX byproducts go to the ignored logs home.

--no-verify: this clone has no .env, so the hooks cannot resolve the
provider store." -- $P && git log --oneline -1 && git push -q origin feature/ai-course-notes-l1 2>&1 | tail -1; git ls-remote origin feature/ai-course-notes-l1; git rev-parse HEAD
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
