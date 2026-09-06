#!/usr/bin/env python3
"""Control de los gates que miden un CONSUMIDOR y componían su raíz a mano.

Qué haría fallar a este control (sub-patrón D): que un gate resuelva su corpus
fuera del árbol que se le pidió medir. Es el defecto que lo origina — cinco
gates hacían `Path(__file__).resolve().parents[N]`, calibrado para
`kaupamex-docs/.claude/scripts/gates/`. Desde `thyrox/src/gates/` eso da
`/home/user`, y el corredor los publicaba SIN MEDIR con mensajes como «no
existe la raíz /home/user/source».

El consumidor es sintético y COMPLETO: tiene las cuatro superficies que los
cinco gates buscan. Así, un gate que resuelva bien mide algo; uno que resuelva
mal nombra una ruta de fuera. La distinción es exactamente el fenómeno.
"""
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

AQUI = pathlib.Path(__file__).resolve().parent
THYROX = AQUI.parent.parent
GATES = THYROX / 'src' / 'gates'

#: gate -> cómo se invoca. Ninguno lleva argumentos: es la convención del
#: registro, que la referencia (`ccnmt: scripts/doctor-architecture.ts`) fija
#: al declarar un `Check` sin campo de argumentos.
MEDIDOS = (
    'check_rst_referencias.py',
    'check_error_catalog.py',
    'check_generator_determinism.py',
    'check_hooks_timeout.py',
    'check_branch_commit_messages.sh',
)


def consumidor_sintetico(base):
    """Un árbol con las cuatro superficies que los cinco gates buscan."""
    raiz = pathlib.Path(base).resolve()
    (raiz / '.claude' / 'eventos').mkdir(parents=True)
    (raiz / '.claude' / 'rules').mkdir(parents=True)
    (raiz / 'source' / 'gestion' / 'pm' / 'docs' / 'errores').mkdir(parents=True)
    (raiz / 'source' / 'index.rst').write_text('Titulo\n======\n')
    ganchos = raiz / '.githooks'
    ganchos.mkdir()
    cm = ganchos / 'commit-msg'
    cm.write_text('#!/usr/bin/env bash\nexit 0\n')
    cm.chmod(0o755)
    (raiz / '.claude' / 'settings.json').write_text('{"hooks":{}}\n')
    subprocess.run(['git', 'init', '-q'], cwd=raiz, check=True)
    return raiz


class ConsumerRootGatesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = consumidor_sintetico(self.tmp.name)
        self.entorno = dict(os.environ)
        self.entorno.pop('THYROX_CONSUMER', None)

    def tearDown(self):
        self.tmp.cleanup()

    def _correr(self, gate):
        ruta = GATES / gate
        corredor = ['bash'] if ruta.suffix == '.sh' else [sys.executable]
        return subprocess.run([*corredor, str(ruta)], cwd=str(self.raiz),
                              capture_output=True, text=True, timeout=120,
                              env=self.entorno)

    def test_ninguno_nombra_una_ruta_de_fuera(self):
        """Cada gate resuelve su corpus DENTRO del consumidor que se le dio.

        No se afirma que pase: un consumidor sintético puede tener
        violaciones reales. Se afirma que la ruta que nombra es del árbol
        medido — que es la diferencia entre «midió» y «no encontró nada
        porque miró en otro sitio».
        """
        fuera = []
        for gate in MEDIDOS:
            hecho = self._correr(gate)
            texto = hecho.stdout + hecho.stderr
            # La ruta del PROPIO gate no es corpus: un guion que se nombra en
            # su mensaje de uso (`bash $0 <ref>`) no está midiendo fuera.
            texto = texto.replace(str(GATES / gate), '<el gate>')
            for linea in texto.splitlines():
                for pieza in linea.replace('`', ' ').split():
                    if not pieza.startswith('/'):
                        continue
                    ruta = pieza.rstrip('.,:')
                    if ruta.startswith(str(THYROX)) or ruta.startswith('/home/user/'):
                        if not ruta.startswith(str(self.raiz)):
                            fuera.append(f'{gate}: {ruta}')
        self.assertEqual([], fuera,
                         'gates que nombran una ruta fuera del consumidor')

    def test_ninguno_revienta_antes_de_resolver(self):
        """Un gate que crashea no nombra ninguna ruta — y eso NO es medir.

        Es la ceguera que la anulación de este mismo control destapó: al
        revertir un gate a su aritmética, el test siguió en verde porque el
        `NameError` que yo mismo había introducido lo mataba antes de imprimir
        nada. Un veredicto ausente y uno correcto se veían igual, que es el
        sub-patrón D dentro del propio control.
        """
        rotos = []
        for gate in MEDIDOS:
            hecho = self._correr(gate)
            texto = hecho.stdout + hecho.stderr
            if 'Traceback (most recent call last)' in texto:
                rotos.append(f'{gate}: traceback')
            elif hecho.returncode not in (0, 1, 2):
                rotos.append(f'{gate}: exit {hecho.returncode}')
            elif not texto.strip():
                rotos.append(f'{gate}: sin salida')
        self.assertEqual([], rotos, 'gates que no emitieron veredicto')


if __name__ == '__main__':
    unittest.main(verbosity=2)
