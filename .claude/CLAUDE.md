# CLAUDE.md — THYROX

El producto vive en `src/`, su suite en `tests/`, y **este directorio es el
estado**: lo que la sesión lee y escribe. La partición es la DEC-01, con
`claw-code` como precedente medido — su `.claude/` contiene `sessions/` y nada
más.

`_references/` es el material contra el que se construye: los cinco corpus
vendorizados (`ccb`, `claude-code`, `harness-books`, `harness-engineering`,
`how-claude-code-works`, cada uno con su `PROVENANCE.md`) más 55 documentos de
autoría propia sobre la plataforma. **No es producto ni estado** — es apoyo a
la construcción, el mismo papel que `odoo-tools` cumple para el producto de
kaupamex, y por eso vive en la raíz y no bajo `src/` ni bajo `.claude/`.
Directiva del ejecutor 2026-09-05.

`_archived/` es el THYROX anterior (DEC-02). **No se lee como si fuera vigente**:
se consulta una pieza sólo si hace falta verla, y lo que se recupere se porta
con su procedencia declarada, no se restaura.

Qué hay hoy, y su suite, está en [README.md](../README.md) — no se duplica aquí.

## Por qué este archivo es corto

Medido en `kaupamex-docs` (:ref:`h-docs-104`): **113 reglas, 697 179 bytes, cero
con `paths:`**, o sea ~126 000 tokens de piso que **cada subagente vuelve a
pagar**. THYROX no repite eso. Una regla entra aquí sólo si gobierna **todo**
trabajo en este árbol; si gobierna un dominio, lleva `paths:` y carga sólo ahí;
si describe cómo funciona una pieza, va en la cabecera de la pieza.

## Flujo de sesión

1. Leer el `README.md` — qué existe y cómo se corre.
2. Correr `bash tests/run.sh` antes de tocar nada: el estado de partida se mide,
   no se asume.
3. Trabajar en TDD, con la mitad roja persistida y su control de anulación.
4. **Antes de citar una tarea propia** en un commit, un banco o un hallazgo:
   acuñar su cita durable con `src/task/task_ids.py ingerir-board <session_id>
   <ordinal> --capa thyrox`. El `#NNN` que el cliente asigna a una tarjeta del
   board **reinicia por sesión** (332 de 337 ids miden colisión entre dos
   sesiones, `task_ids.py`) — citarlo en texto que sobrevive al turno es
   fabricar una referencia rota desde el primer commit. `TASK-THYROX-NNNN` es
   la única forma que resuelve siempre a la misma tarea.
5. **Cuando el trabajo destape algo que no era obvio antes de medir** —una
   cifra que resultó otra, una premisa que resultó falsa, una decisión de
   diseño ajena que explica un comportamiento— se registra con
   `src/agents/agent_store.py agregar-hallazgo`, citando en `--source-ref` el
   archivo que es la fuente de verdad. El banco (`.claude/workbench/`) y el
   job (`.claude/jobs/`) documentan *cómo* se ejecutó el trabajo; un hallazgo
   documenta *qué se aprendió* y es lo único que queda indexado y buscable
   entre sesiones (`agent_store.py buscar-hallazgos`). No todo trabajo
   produce uno — sólo el que corrige algo que alguien podría volver a asumir.
6. Commitear por pathspec y publicar. El árbol no se deja sucio entre turnos.

Los pasos 4 y 5 no estaban aquí hasta que su ausencia costó un episodio real:
un turno completo citó `#9`/`#10` en dos commits y el banco de evidencia sin
acuñar su `TASK-THYROX-NNNN`, y una discrepancia de cifra medida (9 paquetes
citados al abrir la tarea contra 12 medidos al cerrarla) quedó sólo en la
prosa del banco, no en el registro buscable — hasta que el ejecutor preguntó
por qué. `README.md` no mencionaba ninguno de los dos mecanismos (medido:
`grep -c "task_ids\|agregar-hallazgo" README.md` → 0), así que una sesión que
sólo leía el flujo de arriba no tenía cómo saber que existían.

## Lo que este árbol NO decide por su cuenta

Nada que contradiga una decisión ya registrada en
`kaupamex-docs: source/gestion/pm/docs/iniciativas/actualizar-agentic-ai-thyrox/`.
Ese es el registro de gobierno; aquí vive el código que lo implementa.
