#!/usr/bin/env python3
"""Control de `check_env_contract_keys.py`.

Qué haría fallar a este control (sub-patrón D): que el gate diera verde con una
clave leída y no declarada — que es el estado en que estaba el árbol cuando se
midió (27 leídas, 9 declaradas, 18 sin declarar).

El caso negativo usa una clave REAL del repo, no una fabricada. Fabricar el
incumplidor lo escribe quien escribió el patrón, y hereda su encuadre: pasaría
igual con un gate que sólo supiera ver la forma que su autor imaginó.
"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
GATE = THYROX / 'src' / 'gates' / 'check_env_contract_keys.py'

#: Real, y leída por la vía INDIRECTA (constante → `env_value`), que es la que
#: el instrumento anterior no seguía. Si el gate sólo viera lecturas directas,
#: este caso pasaría en verde y el control no discriminaría.
REAL_KEY = 'THYROX_BOARD_ROOT'


def run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(GATE), '--root', str(THYROX), *args],
        capture_output=True, text=True,
    )


class EnvContractKeysGate(unittest.TestCase):
    def test_arbol_real_sin_claves_sin_declarar(self):
        """El positivo: el árbol tal como está pasa en estricto."""
        result = run('--strict')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('sin declarar: 0', result.stdout)

    def test_retirar_una_clave_real_la_delata(self):
        """El negativo: sin `REAL_KEY` declarada, el gate la nombra y rehúsa."""
        source = (THYROX / '.env.example').read_text()
        self.assertIn(f'{REAL_KEY}=', source, f'{REAL_KEY} ya no se declara; elegir otra real')
        mutated = '\n'.join(
            line for line in source.splitlines() if not line.startswith(f'{REAL_KEY}=')
        )
        with tempfile.NamedTemporaryFile('w', suffix='.env.example', delete=False) as handle:
            handle.write(mutated)
            path = handle.name
        result = run('--env-example', path, '--strict')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn(f'SIN DECLARAR  {REAL_KEY}', result.stdout)

    def test_un_prefijo_de_familia_no_es_una_clave(self):
        """`THYROX_WORKBENCH_` compone una familia; nadie exporta ese nombre.

        Sin la exclusion el gate exigia declararlo en `.env.example`, o sea
        documentar una obligacion que no existe. El control mide la ausencia:
        si el prefijo volviera a contar, esta asercion cae.
        """
        result = run()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn('THYROX_WORKBENCH_ ', result.stdout)
        self.assertNotIn('SIN DECLARAR  THYROX_WORKBENCH_', result.stdout)

    def test_sin_archivo_rehusa_sin_emitir_cifra(self):
        """Un 0 sin archivo no distinguiría «no falta ninguna» de «no pude medir»."""
        result = run('--env-example', '/no/existe/.env.example', '--strict')
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertNotIn('sin declarar:', result.stdout)


if __name__ == '__main__':
    unittest.main()
