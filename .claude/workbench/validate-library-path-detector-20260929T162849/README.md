# Validación de TASK-THYROX-0608 — detector de invocación por ruta

| Capa | Qué se midió | Resultado |
|---|---|---|
| 1 — disparo en vivo | el hook de esta sesión ante el comando del episodio | avisó antes de ejecutar; el comando murió con `ModuleNotFoundError: paths` |
| 2 — despacho real | `bin/tool_use_preflight < payload-positive.json` | el aviso nombra `bin/task_ids` |
| 3 — anulación | `nullification.txt` | sin comprobar `bin/<stem>`: cae sólo «biblioteca sin bin/ calla»; sin descartar heredoc: cae sólo su caso; restaurado 9/9 y `git diff` vacío |
| 4 — cobertura | `src-stems.txt` ∩ `bin-names.txt` | 204 de 281 envoltorios son módulos `.py` que el aviso puede nombrar |

Dos defectos que salieron al validar, con su sucesor:

- **H-THYROX-277** → TASK-THYROX-0609: avisa sobre texto entre comillas que no
  se ejecuta (`payload-quoted.json`: 1 aviso).
- **H-THYROX-278** → TASK-THYROX-0610: `bin/check_rst_sintaxis --help` ignora la
  bandera y audita todo `source/`.

*Métrica:* avisos del despachador real y aserciones de la suite del detector.
*Ciega a:* si el aviso cambia la conducta de quien lo recibe.
