W=.claude/workbench/execution-image-equivalence-20261002
cat > $W/README.md <<'MD'
# Equivalencia anfitrión ↔ ExecutionUnit de los verificadores es-MX (P5a/P5b)

Identidad: `ai-course-notes:es-mx/execution-image` (referencia de trabajo del
consumidor). Proveedor: `build-image --work` (TASK-THYROX-0760).

## Toolchain derivado del call path de V0–V6 (`tools/thyrox/execution-image/Containerfile`)

| Llamado desde | Herramienta |
|---|---|
| `check_prose_vocabulary.py` | `hunspell` (diccionario del repositorio, `tools/lang/es-mx/hunspell/es_MX`) |
| `translation_loop.py` compile (V5) | `xelatex` + `NOTES_TEXLIVE_PACKAGES` de `tools/lib/toolchain.sh` |
| preámbulo localizado | FandolSong (`texlive-lang-chinese`), WenQuanYi Zen Hei (`fonts-wqy-zenhei`) |

Fuera: V7 (`render_pdf_qa.py`: pdftoppm, magick, mutool) — revisión visual por
muestreo; ninguna de las pruebas medidas es de V7. `fonts-arphic-uming` no se
añade: tampoco está en el anfitrión (la señal «AR PL UMing CN» de una nota es
igual en los dos lados).

Imagen `localhost/ai-course-notes-runner:dev`: 1.03 GB (comparte los 386 MB de
la base). Disco libre: 5.11 GB antes, mínimo 2.76 GB durante el build, 4.55 GB
después.

## Medición (`tests/test_translation_loop.py`, 61 pruebas)

| Entorno | Resultado |
|---|---|
| anfitrión, Python 3.12.3, solo | 61 aprobadas (`outputs/host-baseline.txt`) |
| unidad, imagen del consumidor, Python 3.12.3, sola | 61 aprobadas (`outputs/unit-image.txt`) |
| unidad, imagen BASE de thyrox (anulación) | 29 fallidas: `hunspell` y `xelatex` ausentes y sus cascadas (`outputs/annul-base-image.txt`) |

## Lo que la medición corrigió

1. **El `.venv` es compartido y el intérprete no estaba fijado.** El anfitrión
   usa 3.11 por defecto y la unidad 3.12; los dos cumplen `requires-python
   >=3.11`, así que cada `uv run` reconstruía el `.venv` del otro. Las dos
   primeras líneas base del anfitrión (`outputs/host-baseline-race*.txt`, 10 y
   24 fallos por `spacy-lookups-data` ausente) midieron esa carrera, no el
   toolchain. `.python-version` = 3.12 (existe en los dos) lo cierra.
2. **Anfitrión y unidad no se miden a la vez:** comparten árbol y `.venv`.
3. **Comparar fallos por nombre ocultó una regresión de P7:** una segunda
   prueba de la ola aún pasaba `--model`; fallaba antes por `hunspell` y
   después por `--model`, y la comparación por nombre la contó como la misma.
   Corregida aquí.
MD
git add -N $W tools/thyrox/execution-image/Containerfile .python-version
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com \
git commit -q -m 'Run the es-MX verifiers inside execution units' -m 'The thyrox base image lacks hunspell and xelatex, so 29 loop tests
failed inside a unit. The project now declares its own execution image,
built through thyrox build-image under its work reference, with only
what the V0-V6 call path invokes. The shared .venv also flipped between
the host Python 3.11 and the unit 3.12; .python-version pins 3.12.

Host and unit now pass the same 61 tests; the base image fails 29.
Also drops the last --model left in a wave test.

Work reference: ai-course-notes:es-mx/execution-image.' -- \
  tools/thyrox/execution-image/Containerfile .python-version tests/test_translation_loop.py $W
git log -1 --format='%h %an / %cn %s'; git push -q origin HEAD 2>&1 | tail -1; git status --short | head -3
