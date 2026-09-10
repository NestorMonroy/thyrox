#!/usr/bin/env python3
"""Control de la etiqueta del aviso de `commit-msg`, y de su consumidor.

Que haria fallar a este control: cambiar la etiqueta en el emisor sin cambiar
el literal que `check_branch_commit_messages.sh` grepea. Ese par es una fuente
de verdad partida en dos archivos, y su deriva es SILENCIOSA — el consumidor
seguiria corriendo y publicaria «sin razon» para todo commit avisado.

Y el segundo caso mide lo que la etiqueta promete: el hook invoca al gate con
`|| true`, asi que el commit pasa. Una etiqueta que dijera ERROR prometeria un
bloqueo inexistente — significante y significado en desacuerdo.
"""
from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile

# Bootstrap canónico (`paths.reach.BOOTSTRAP`): ascenso con detección hasta
# el marcador, NO `parents[N]`. Un offset acierta a UNA profundidad y falla en
# silencio al mover el archivo; el ascenso sobrevive el cambio de anidamiento.
# Es el único punto donde `paths.reach` todavía no se puede importar — de ahí
# en adelante la raíz sale de `reach.thyrox_root()`, no de más aritmética.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))
from verify import commit_message  # noqa: E402
from paths import reach  # noqa: E402

#: A partir de aquí la raíz sale del localizador declarado, no del bootstrap.
THYROX = reach.thyrox_root()

CONSUMER = THYROX / 'src' / 'verify' / 'check_branch_commit_messages.sh'
HOOK = THYROX / '.githooks' / 'commit-msg'

ok = fallos = 0


def check(label: str, esperado, obtenido) -> None:
    global ok, fallos
    if esperado == obtenido:
        ok += 1
        print(f'  ok    {label}')
    else:
        fallos += 1
        print(f'  FALLO {label}: esperado {esperado!r}, obtenido {obtenido!r}')


def main() -> int:
    etiqueta = commit_message.WARNING_LABEL
    check('la etiqueta no promete un bloqueo', False, etiqueta.startswith('ERROR'))
    consumidor = CONSUMER.read_text(encoding='utf-8')
    check('el consumidor grepea la etiqueta que el emisor imprime',
          True, etiqueta in consumidor)

    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as handle:
        handle.write('Probe subject\n\n' + 'x' * 90 + '\n')
        ruta = handle.name
    salida = subprocess.run(
        [sys.executable, str(THYROX / 'src' / 'verify' / 'commit_message.py'), ruta],
        capture_output=True, text=True)
    check('el aviso lleva la etiqueta declarada', True, etiqueta in salida.stderr)
    check('invocado a mano SI decide', 1, salida.returncode)

    # El hook lo invoca con `|| true`: su no-bloqueo es su contrato.
    check('el hook no detiene el commit', True, '|| true' in HOOK.read_text(encoding='utf-8'))

    print(f'test-commit-message-label: {ok} ok, {fallos} fallo(s)')
    return 1 if fallos else 0


if __name__ == '__main__':
    raise SystemExit(main())
