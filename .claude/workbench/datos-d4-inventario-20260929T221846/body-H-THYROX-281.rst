- **Archivo:** ``thyrox: src/agents/merge_sqlite_union.py:131``
- **Premisa verificada:** la unión ejecuta
  ``INSERT OR IGNORE INTO main."<tabla>" SELECT * FROM suyo."<tabla>"``. Una
  fila cuya clave primaria ya existe en nuestro lado se descarta entera,
  aunque el otro lado la haya cambiado. [PROVEN]

Qué pasa
--------

``agent_store.sqlite3`` se comparte entre sesiones versionado en git con el
driver ``merge=sqlite-union``: lo tocan 368 commits del proveedor. El driver
sólo sabe **añadir filas nuevas**. Medido con el driver real sobre dos copias
del esquema real (``thyrox: .claude/workbench/datos-d4-inventario-20260929T221846/probes/union-lost-writes.py``):

.. list-table::
   :header-rows: 1

   * - Caso
     - Escrito
     - Tras el merge
     - Driver
   * - el otro lado pasa ``agent_sessions.status`` de ``running`` a ``completed``
     - ``completed``
     - ``running``
     - exit 0
   * - dos hallazgos nuevos reciben el mismo ``id AUTOINCREMENT`` de ``findings_history``
     - H-OURS-1 y H-THEIRS-1
     - sólo H-OURS-1
     - exit 0
   * - control: el hallazgo del otro lado con ``id`` distinto
     - H-OURS-1 y H-THEIRS-1
     - los dos
     - 1 fila unida

El driver imprime cuántas filas omitió por clave ya presente, pero esa cifra
(11 073 en la sonda) incluye todas las filas iguales en los dos lados: la
pérdida no se distingue en ella.

*Métrica:* estado de las filas tras ejecutar el driver real sobre dos copias
divergentes del esquema real.
*Ciega a:* cuántas escrituras se perdieron ya en los merges reales, y a una
cita ``TASK-*`` acuñada dos veces por dos sesiones (la clave de ``tasks``
incluye ``session_id``, así que esa colisión no se pierde: se duplica).

Por qué importa para D4
-----------------------

Es la forma real del «store compartido de agentes»: una base replicada por
git con consistencia eventual, no una base con clientes concurrentes. Un
PostgreSQL por contenedor no la corrige: reproduce la divergencia sin driver
de merge. Sólo un servidor común a todas las sesiones la eliminaría. El
inventario completo está en el banco
``thyrox: .claude/workbench/datos-d4-inventario-20260929T221846/README.md``.

Lo que este hallazgo no cierra
------------------------------

La corrección del driver sin cambiar de motor: la última escritura gana por
``updated_at`` en las tablas mutables, ``findings_history`` se une por
``finding_id`` y el driver informa las filas perdidas por tabla. Sucesor:
**TASK-THYROX-0626**. La elección de motor sigue siendo decisión del ejecutor
(fase D4).
