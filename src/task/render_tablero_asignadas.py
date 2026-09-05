"""Genera el tablero de las tareas que NO hacemos nosotros.

Documento generado: ``source/gestion/pm/reportes/tablero-de-tareas-asignadas.rst``.
La tabla de duenos vive en ``asignadas.py``; aqui solo esta la redaccion.

NO toca ``tablero-de-tareas.rst``, que lo genera ``agent_store.py
render-tablero`` desde el store y refresca un hook. Son dos registros de
naturaleza distinta y por eso son dos documentos: aquel describe **estado
observado** (que tarea esta en curso), este describe una **decision de alcance**
(cual no nos toca y de quien depende). Mezclarlos haria que el refresco del
primero borrase el segundo.

El asunto de cada tarea se lee del store cuando esta, y si no, se declara
ausente. NO se transcribe a mano: seria una segunda fuente de verdad que nadie
sincroniza, y el asunto cambia cuando alguien renombra la tarea.

Uso::

    python3 render_tablero_asignadas.py            # imprime
    python3 render_tablero_asignadas.py --escribir
"""
import argparse
import pathlib
import sqlite3
import sys

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import asignadas  # noqa: E402

RAIZ = AQUI.parents[2]
STORE = RAIZ / '.claude' / 'agent-results' / 'agent_store.sqlite3'
DESTINO = (RAIZ / 'source' / 'gestion' / 'pm' / 'reportes'
           / 'tablero-de-tareas-asignadas.rst')


def asuntos():
    """El asunto de cada tarea, del store. Ausente se declara, no se inventa."""
    if not STORE.is_file():
        return {}
    con = sqlite3.connect(f'file:{STORE}?mode=ro', uri=True)
    return {int(i): s for i, s, _ in
            con.execute('select task_id, subject, citation_id from tasks')
            if str(i).isdigit()}


def citas():
    """``{ordinal: 'TASK-<CAPA>-NNNN'}`` — la cita durable, si el store la tiene.

    El ordinal de la ficha se reinicia y se reusa por sesion, asi que una cita
    tomada de el no resuelve manana (ERR-024, H-DOCS-1067). Una base sin la
    columna devuelve ``{}`` y el tablero sigue publicando el ordinal solo:
    mismo contrato de compatibilidad que ``selectCitationId`` del harness.
    """
    if not STORE.is_file():
        return {}
    con = sqlite3.connect(f'file:{STORE}?mode=ro', uri=True)
    if 'citation_id' not in {r[1] for r in con.execute('PRAGMA table_info(tasks)')}:
        return {}
    return {int(i): c for i, c in
            con.execute('select task_id, citation_id from tasks '
                        ' where citation_id is not null')
            if str(i).isdigit()}


def identidad(tid, C):
    """``**#122** (``TASK-DOCS-0390``)`` en RST — o el ordinal a secas."""
    cita = C.get(tid)
    return f'**#{tid}** (``{cita}``)' if cita else f'**#{tid}**'


def redacta(fecha):
    S = asuntos()
    C = citas()
    L = []
    A = L.append
    A('.. meta::')
    A('   :artefacto: tablero-de-tareas-asignadas')
    A('   :tipo: Reporte de estado')
    A('   :dominio: gestion')
    A('   :estado: vigente')
    A(f'   :fecha_actualizacion: {fecha}')
    A('   :autor: Equipo Kaupamex')
    A('   :clasificacion: interno')
    A('   :generado_por: .claude/scripts/task/render_tablero_asignadas.py')
    A('   :fuente: .claude/scripts/task/asignadas.py')
    A('')
    A('.. _tablero-de-tareas-asignadas:')
    A('')
    A('Tablero de tareas asignadas')
    A('===========================')
    A('')
    A('Documento **generado**. La tabla de dueños vive en')
    A('``.claude/scripts/task/asignadas.py``; editarla ahí y regenerar. Editar')
    A('este archivo a mano lo desincroniza de su fuente.')
    A('')
    A('Registro de las tareas que **no hacemos nosotros** y de quién dependen.')
    A('Directiva del ejecutor 2026-08-28: *«nosotros sólo vamos a hacer tareas')
    A('relacionadas con API»*. No están descartadas — están asignadas, y esto')
    A('es su registro para que no se pierdan ni vuelvan a entrar por orden de')
    A('ID.')
    A('')
    A('No sustituye a :ref:`tablero-de-tareas`. Aquél describe **estado')
    A('observado** —qué tarea está en curso— y lo regenera el store; éste')
    A('describe una **decisión de alcance**. Son dos documentos porque el')
    A('refresco del primero borraría al segundo.')
    A('')
    A('Dónde está la frontera')
    A('----------------------')
    A('')
    A('No es «dónde están los archivos que la tarea menciona» sino **de qué')
    A('árbol es el entregable**:')
    A('')
    A('- entregable = un gate, un hook o un guion de ``.claude/`` → tooling,')
    A('  aunque mida ``api``;')
    A('- entregable = una regla o una convención → gobernanza, aunque la')
    A('  cumpla ``api``;')
    A('- entregable = código de ``src/`` o ``addons/`` → **nuestra**.')
    A('')
    A('Por eso ``#101`` —avisar cuando un ``.rst`` cite un ``.py`` inexistente—')
    A('es de docs aunque las rutas que revisa apunten a ``api``, y ``#61`` —el')
    A('gate de la base desde cero— es nuestra aunque sea un gate: su entregable')
    A('toca migraciones.')
    A('')
    A('Los dueños')
    A('----------')
    A('')
    A('No son personas: son las áreas de las que la tarea depende, que es lo')
    A('que se puede afirmar sin inventar nombres.')
    A('')
    A('.. list-table::')
    A('   :header-rows: 1')
    A('')
    A('   * - Dueño')
    A('     - Qué cubre')
    A('     - Tareas')
    for dueno, que in sorted(asignadas.DUENOS.items()):
        ids = [str(i) for i, d, _ in asignadas.ASIGNADAS if d == dueno]
        A(f'   * - ``{dueno}``')
        A(f'     - {que}')
        A(f'     - {len(ids)} — {", ".join("#" + i for i in ids)}')
    A('')
    A('Las asignadas')
    A('-------------')
    A('')
    A('.. list-table::')
    A('   :header-rows: 1')
    A('')
    A('   * - Tarea')
    A('     - Dueño')
    A('     - Asunto')
    A('     - Por qué no es nuestra')
    for tid, dueno, porque in asignadas.ASIGNADAS:
        A(f'   * - {identidad(tid, C)}')
        A(f'     - ``{dueno}``')
        A(f'     - {S.get(tid, "*(el store aún no la tiene)*")}')
        A(f'     - {porque}')
    A('')
    A('Con trabajo ya hecho')
    A('--------------------')
    A('')
    A('Se declara para que quien las tome no lo rehaga, y para que conste que')
    A('se commiteó **por no perderlo con el contenedor, no por adoptar la')
    A('tarea**.')
    A('')
    A('.. list-table::')
    A('   :header-rows: 1')
    A('')
    A('   * - Tarea')
    A('     - Commit')
    A('     - Qué hay')
    for tid, (commit, que) in sorted(asignadas.TRABAJO_PARCIAL.items()):
        A(f'   * - {identidad(tid, C)}')
        A(f'     - ``{commit}``')
        A(f'     - {que}')
    A('')
    A('Devueltas al alcance de API')
    A('---------------------------')
    A('')
    A('Una frontera se aprende de sus casos dudosos, no de su enunciado. Éstas')
    A('estuvieron en la tabla y salieron tras revisarlas con el ejecutor.')
    A('')
    for tid, porque in asignadas.DEVUELTAS:
        A(f'- {identidad(tid, C)} — {porque}')
    A('')
    A('*Métrica:* las filas que ``asignadas.py`` declara; el asunto y la cita')
    A('durable se leen del store, y el asunto se marca ausente cuando no está.')
    A('*Ciega a:* si el dueño **aceptó** la asignación — esto registra de quién')
    A('depende la tarea, no que alguien se haya comprometido con ella.')
    A('')
    return '\n'.join(L) + '\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--escribir', action='store_true')
    ap.add_argument('--fecha', required=True,
                    help='ISO 8601 de date -u; NO se toma del reloj para que '
                         'dos ejecuciones den el mismo documento')
    args = ap.parse_args()

    doc = redacta(args.fecha)
    if args.escribir:
        DESTINO.write_text(doc, encoding='utf-8')
        print(f'escrito {DESTINO}')
    else:
        print(doc)
    print(f'{len(asignadas.ASIGNADAS)} asignadas · '
          f'{len(asignadas.DEVUELTAS)} devueltas · '
          f'{len(asignadas.DUENOS)} duenos', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
