"""
check_role_abstraction.py
==========================
Verificador de abstraccion de roles en artefactos de requisitos.

Detecta tres tipos de violaciones de la normativa
``metodologia-abstraccion-roles.rst``:

  Regla A — Bloques code-block:: python en seccion de Especificacion
  Regla B — Atributos de modelos obsoletos o jerga ORM en narrativa
  Regla C — Llamadas ORM en texto narrativo (fuera de bloques de codigo)

Uso:
    python check_role_abstraction.py [directorio]

    Si no se indica directorio usa el raiz del proyecto de documentacion.

Salida:
    Lista de violaciones en formato:
        REGLA | archivo | linea | fragmento
    Retorna 0 si no hay violaciones, 1 si hay alguna.
"""

import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Regla A: code-block:: python en seccion 2 (Especificacion)
# ---------------------------------------------------------------------------
SECTION_START = re.compile(r'^2\.\s+Especificacion', re.MULTILINE)
SECTION_END = re.compile(r'^3\.\s+Criterio', re.MULTILINE)
PYTHON_BLOCK = re.compile(r'\.\.\s+code-block::\s+python')


def check_regla_a(path: Path, contenido: str) -> list[dict]:
    """Detecta bloques code-block:: python dentro de la seccion 2."""
    violations = []
    m_inicio = SECTION_START.search(contenido)
    m_fin = SECTION_END.search(contenido)

    if not m_inicio:
        return violations

    inicio = m_inicio.start()
    fin = m_fin.start() if m_fin and m_fin.start() > inicio else len(contenido)
    section = contenido[inicio:fin]

    for m in PYTHON_BLOCK.finditer(section):
        line = contenido[:inicio + m.start()].count('\n') + 1
        violations.append({
            'regla': 'A',
            'archivo': str(path),
            'linea': line,
            'fragmento': '.. code-block:: python',
        })
    return violations


# ---------------------------------------------------------------------------
# Regla B: atributos obsoletos o nombres de modelos incorrectos
# ---------------------------------------------------------------------------
# Lista derivada del analisis-inconsistencias-nombres-modelos.rst
ATRIBUTOS_OBSOLETOS = [
    'ProductSize',
    'CartSession',
    'UserProfile',
    'OrderItem\\.item_price',
    'cart_item',
    'CartItem',
]

# Patrones de jerga ORM que no pertenecen a especificacion de requisitos
ORM_NARRATIVA = [
    r'\.objects\.',
    r'\.save\(',
    r'\.filter\(',
    r'\.get\(',
    r'\.create\(',
    r'select_related',
    r'prefetch_related',
    r'QuerySet',
]

PATRON_B = re.compile(
    '(' + '|'.join(ATRIBUTOS_OBSOLETOS + ORM_NARRATIVA) + ')',
    re.IGNORECASE,
)


def _lines_outside_blocks(contenido: str) -> list[tuple[int, str]]:
    """Retorna (numero_linea, texto) para lineas fuera de code-block."""
    resultado = []
    in_block = False
    indent_bloque = 0

    for i, line in enumerate(contenido.splitlines(), start=1):
        stripped = line.lstrip()
        if re.match(r'\.\.\s+code-block::', stripped):
            in_block = True
            indent_bloque = len(line) - len(stripped)
            continue
        if in_block:
            if line.strip() == '':
                continue
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= indent_bloque and line.strip():
                in_block = False
            else:
                continue
        resultado.append((i, line))
    return resultado


def check_regla_b(path: Path, contenido: str) -> list[dict]:
    """Detecta atributos obsoletos y jerga ORM en narrativa."""
    violations = []
    lineas_narrativa = _lines_outside_blocks(contenido)

    for line_num, texto in lineas_narrativa:
        m = PATRON_B.search(texto)
        if m:
            violations.append({
                'regla': 'B',
                'archivo': str(path),
                'linea': line_num,
                'fragmento': texto.strip()[:120],
            })
    return violations


# ---------------------------------------------------------------------------
# Regla C: llamadas ORM especificas en narrativa
# ---------------------------------------------------------------------------
ORM_ESPECIFICO = re.compile(
    r'(\.objects\.|\.save\(|\.filter\(|\.get\(|\.create\(|'
    r'select_related|prefetch_related|QuerySet)',
)


def check_regla_c(path: Path, contenido: str) -> list[dict]:
    """Detecta llamadas ORM en narrativa (fuera de bloques de codigo)."""
    violations = []
    lineas_narrativa = _lines_outside_blocks(contenido)

    for line_num, texto in lineas_narrativa:
        if ORM_ESPECIFICO.search(texto):
            violations.append({
                'regla': 'C',
                'archivo': str(path),
                'linea': line_num,
                'fragmento': texto.strip()[:120],
            })
    return violations


# ---------------------------------------------------------------------------
# Ejecucion principal
# ---------------------------------------------------------------------------
def analyze_file(path: Path) -> list[dict]:
    """Aplica las tres reglas a un archivo RST."""
    contenido = path.read_text(encoding='utf-8', errors='replace')
    violations = []
    violations.extend(check_regla_a(path, contenido))
    violations.extend(check_regla_b(path, contenido))
    # Regla C es subconjunto de B; se incluye por separado para claridad
    # en el reporte cuando no hay atributos obsoletos pero si ORM.
    # Se evita duplicados chequeando que B ya no lo reporto.
    reportadas_b = {(v['linea'], v['fragmento']) for v in violations if v['regla'] == 'B'}
    for v in check_regla_c(path, contenido):
        if (v['linea'], v['fragmento']) not in reportadas_b:
            violations.append(v)
    return violations


def main(directory: str = '.') -> int:
    raiz = Path(directory)
    archivos = sorted(raiz.rglob('*.rst'))
    total = []

    for file in archivos:
        # Solo analizar artefactos de requisitos funcionales y casos de uso
        partes = file.parts
        if not any(p in partes for p in ['requisitos-funcionales', 'casos-uso']):
            continue
        total.extend(analyze_file(file))

    if not total:
        print(f"Sin violaciones en {len(archivos)} archivos RST analizados.")
        return 0

    print(f"\n{len(total)} violacion(es) encontrada(s):\n")
    print(f"{'REGLA':<6} {'LINEA':<6} {'ARCHIVO':<60} FRAGMENTO")
    print('-' * 120)
    for v in sorted(total, key=lambda x: (x['archivo'], x['linea'])):
        short_file = v['archivo'][-55:] if len(v['archivo']) > 55 else v['archivo']
        print(f"  {v['regla']:<4} {v['linea']:<6} {short_file:<60} {v['fragmento'][:50]}")
    return 1


if __name__ == '__main__':
    directory = sys.argv[1] if len(sys.argv) > 1 else '.'
    sys.exit(main(directory))
