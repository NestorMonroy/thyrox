"""
check_abstraccion_roles.py
==========================
Verificador de abstraccion de roles en artefactos de requisitos.

Detecta tres tipos de violaciones de la normativa
``metodologia-abstraccion-roles.rst``:

  Regla A — Bloques code-block:: python en seccion de Especificacion
  Regla B — Atributos de modelos obsoletos o jerga ORM en narrativa
  Regla C — Llamadas ORM en texto narrativo (fuera de bloques de codigo)

Uso:
    python check_abstraccion_roles.py [directorio]

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
SECCION_INICIO = re.compile(r'^2\.\s+Especificacion', re.MULTILINE)
SECCION_FIN = re.compile(r'^3\.\s+Criterio', re.MULTILINE)
PYTHON_BLOCK = re.compile(r'\.\.\s+code-block::\s+python')


def check_regla_a(path: Path, contenido: str) -> list[dict]:
    """Detecta bloques code-block:: python dentro de la seccion 2."""
    violaciones = []
    m_inicio = SECCION_INICIO.search(contenido)
    m_fin = SECCION_FIN.search(contenido)

    if not m_inicio:
        return violaciones

    inicio = m_inicio.start()
    fin = m_fin.start() if m_fin and m_fin.start() > inicio else len(contenido)
    seccion = contenido[inicio:fin]

    for m in PYTHON_BLOCK.finditer(seccion):
        linea = contenido[:inicio + m.start()].count('\n') + 1
        violaciones.append({
            'regla': 'A',
            'archivo': str(path),
            'linea': linea,
            'fragmento': '.. code-block:: python',
        })
    return violaciones


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


def _lineas_fuera_de_bloques(contenido: str) -> list[tuple[int, str]]:
    """Retorna (numero_linea, texto) para lineas fuera de code-block."""
    resultado = []
    en_bloque = False
    indent_bloque = 0

    for i, linea in enumerate(contenido.splitlines(), start=1):
        stripped = linea.lstrip()
        if re.match(r'\.\.\s+code-block::', stripped):
            en_bloque = True
            indent_bloque = len(linea) - len(stripped)
            continue
        if en_bloque:
            if linea.strip() == '':
                continue
            current_indent = len(linea) - len(linea.lstrip())
            if current_indent <= indent_bloque and linea.strip():
                en_bloque = False
            else:
                continue
        resultado.append((i, linea))
    return resultado


def check_regla_b(path: Path, contenido: str) -> list[dict]:
    """Detecta atributos obsoletos y jerga ORM en narrativa."""
    violaciones = []
    lineas_narrativa = _lineas_fuera_de_bloques(contenido)

    for num_linea, texto in lineas_narrativa:
        m = PATRON_B.search(texto)
        if m:
            violaciones.append({
                'regla': 'B',
                'archivo': str(path),
                'linea': num_linea,
                'fragmento': texto.strip()[:120],
            })
    return violaciones


# ---------------------------------------------------------------------------
# Regla C: llamadas ORM especificas en narrativa
# ---------------------------------------------------------------------------
ORM_ESPECIFICO = re.compile(
    r'(\.objects\.|\.save\(|\.filter\(|\.get\(|\.create\(|'
    r'select_related|prefetch_related|QuerySet)',
)


def check_regla_c(path: Path, contenido: str) -> list[dict]:
    """Detecta llamadas ORM en narrativa (fuera de bloques de codigo)."""
    violaciones = []
    lineas_narrativa = _lineas_fuera_de_bloques(contenido)

    for num_linea, texto in lineas_narrativa:
        if ORM_ESPECIFICO.search(texto):
            violaciones.append({
                'regla': 'C',
                'archivo': str(path),
                'linea': num_linea,
                'fragmento': texto.strip()[:120],
            })
    return violaciones


# ---------------------------------------------------------------------------
# Ejecucion principal
# ---------------------------------------------------------------------------
def analizar_archivo(path: Path) -> list[dict]:
    """Aplica las tres reglas a un archivo RST."""
    contenido = path.read_text(encoding='utf-8', errors='replace')
    violaciones = []
    violaciones.extend(check_regla_a(path, contenido))
    violaciones.extend(check_regla_b(path, contenido))
    # Regla C es subconjunto de B; se incluye por separado para claridad
    # en el reporte cuando no hay atributos obsoletos pero si ORM.
    # Se evita duplicados chequeando que B ya no lo reporto.
    reportadas_b = {(v['linea'], v['fragmento']) for v in violaciones if v['regla'] == 'B'}
    for v in check_regla_c(path, contenido):
        if (v['linea'], v['fragmento']) not in reportadas_b:
            violaciones.append(v)
    return violaciones


def main(directorio: str = '.') -> int:
    raiz = Path(directorio)
    archivos = sorted(raiz.rglob('*.rst'))
    total = []

    for archivo in archivos:
        # Solo analizar artefactos de requisitos funcionales y casos de uso
        partes = archivo.parts
        if not any(p in partes for p in ['requisitos-funcionales', 'casos-uso']):
            continue
        total.extend(analizar_archivo(archivo))

    if not total:
        print(f"Sin violaciones en {len(archivos)} archivos RST analizados.")
        return 0

    print(f"\n{len(total)} violacion(es) encontrada(s):\n")
    print(f"{'REGLA':<6} {'LINEA':<6} {'ARCHIVO':<60} FRAGMENTO")
    print('-' * 120)
    for v in sorted(total, key=lambda x: (x['archivo'], x['linea'])):
        archivo_corto = v['archivo'][-55:] if len(v['archivo']) > 55 else v['archivo']
        print(f"  {v['regla']:<4} {v['linea']:<6} {archivo_corto:<60} {v['fragmento'][:50]}")
    return 1


if __name__ == '__main__':
    directorio = sys.argv[1] if len(sys.argv) > 1 else '.'
    sys.exit(main(directorio))
