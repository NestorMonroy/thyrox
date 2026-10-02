# citation-renumbering

## El encargo

<!-- verbatim, sin parafrasear -->

> conservar los de esa rama y renumerar los nuestros, y agrega una nota a una columna que diga que es de esta sesion,
> y revisamos lo que tenemos implemetado en thyrox para lo de MODLAD?

## La premisa, si se corrigio al primer comando

Se suponía que en esta rama todas las citas TASK-THYROX-0754…0764 eran de esta
sesión. No: el merge anterior de `feature/complete-orm-root` (`502f37a2e`) ya
trajo 0754 (`test_continuation_frontier.py`, `test-continuation-frontier-e2e.sh`),
0755 (`src/learning/__init__.py`, `tests/learning/test_token_usage.py`) y 0758
(las pruebas de contención). Un reemplazo global las habría corrompido. Por eso
cada línea se decide con `git blame`: cambia sólo si su commit está en
`origin/feature/complete-orm-root..HEAD`.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/renumber_citations.py` | busca con `rg` (regla `search-the-git-index.md`), filtra por `git blame`, reescribe las líneas propias y actualiza el store con la nota en `metadata_json` |
| `probes/derived_tests.sh` | corre las pruebas cuyo archivo o fuente cambió |

## Los resultados

| Antes | Después |
|---|---|
| TASK-THYROX-0754 … 0764 | TASK-THYROX-0769 … 0779 (mismo orden, +15) |
| H-THYROX-311 | H-THYROX-314 |
| H-THYROX-312 | H-THYROX-315 |

- 40 archivos de thyrox y 4 de ai-course-notes, 56 líneas; los seis archivos
  que traen citas de la otra rama quedaron con 0 líneas cambiadas.
- 13 filas del store, una por cita, con `metadata_json`
  `{"session_note": "acuñada en la sesión 81a17524…, rama feature/ai-course-notes-l1", "renumbered_from": …, "renumbered_reason": …}`;
  los dos hallazgos llevan además `session_id`.
- No se tocan `.claude/jobs/`, ni `outputs/`/`probes/` de los bancos, ni los
  mensajes de commit: registran lo que corrió con el número de entonces. La
  tabla de arriba es la traducción, y queda indexada en H-THYROX-316.

Salida: `outputs/renumber.txt`; pruebas: `outputs/{bun,py,sh}-*.txt`.

*Metrica:* líneas reescritas por archivo, filas del store actualizadas y pruebas derivadas.
*Ciega a:* citas en mensajes de commit y registros de jobs, que no cambian a propósito.
