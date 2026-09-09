#!/usr/bin/env python3
"""La superficie pública de la mitad Python (y shell) de thyrox.

``package.json`` declara un ``exports`` que gobierna **la mitad TypeScript** y
nada más: ``exports`` es un mecanismo de resolución de Node, y un consumidor
que invoca ``python3 <ruta>`` o ``bash <ruta>`` no lo consulta jamás. Su
control, ``exports.test.ts``, es ciego a esta mitad **por construcción** — no
es un hueco de cobertura que se pueda tapar allá.

La consecuencia medida: cada consumidor localiza thyrox por **ruta**, y nombra
el archivo concreto. Eso deja a todo módulo de ``src/`` igual de público, así
que mover o renombrar cualquiera de ellos rompe un consumidor sin que nada lo
anuncie — no hay frontera que un cambio pueda cruzar.

Este módulo **es** esa frontera. Declara qué rutas son superficie; lo que no
está declarado es interno y puede moverse sin aviso.

Qué NO es
---------

No es un localizador. Dónde vive thyrox lo resuelve ``paths.reach`` —variable
declarada, ``.env``, ascenso al marcador— y aquí no se reimplementa: una
segunda copia de esa decisión es la fuente de verdad paralela que nadie
sincroniza. Este módulo dice **qué** se puede nombrar, no **dónde** está.

Tampoco es un empaquetado. Un ``pyproject.toml`` exigiría instalar el paquete
en cada consumidor, y el árbol se consume desde el disco por ruta; declarar
la superficie no requiere cambiar eso.

Cómo se deriva, y por qué no se inventa
---------------------------------------

La lista inicial **se midió**: son las rutas que los cinco clones invocan de
forma **ejecutable** —asignadas a una variable bajo ``$THYROX_ROOT``, o
declaradas como ``OWNER_MODULE`` de un stub— no las que la prosa menciona.
La distinción importa: un `.rst` que enumera los 104 gates los *nombra*, no los
*invoca*, y contarlos habría publicado como superficie casi todo ``src/``.

Añadir una ruta aquí es una decisión: significa que thyrox se compromete a
sostener su nombre. Quitarla también.
"""
from __future__ import annotations

#: Rutas relativas a la raíz de thyrox que un consumidor puede nombrar.
#: Medidas sobre los cinco clones el 2026-09-07 (citas ejecutables, no prosa).
PUBLIC_PATHS: tuple[str, ...] = (
    # El localizador y su bootstrap: sin estos dos, ningún otro es alcanzable.
    'src/paths/reach.py',
    'src/paths/reach_roots.py',
    # Hooks que un consumidor delega entero.
    'src/hooks/flow_selection.py',
    'src/hooks/maintenance_chain.py',
    'src/hooks/stop_gate.py',
    'src/hooks/stop_pending_work.py',
    'src/hooks/stop_tests.py',
    # Gates que el consumidor corre sobre SU árbol.
    'src/verify/lint_agents.py',
    'src/verify/pre-push.sh',
    'src/verify/thyrox-audit.sh',
    # Telemetría y tablero.
    'src/agents/agent_store.py',
    'src/task/snapshot-tasks.sh',
    # Sesión: espera, evidencia, instalación.
    'src/session/stranded-evidence.sh',
    'src/session/instalar-config-usuario.sh',
    'src/session/wait-jobs.sh',
)

#: Directorios que un consumidor nombra enteros (pasa la ruta, no un archivo).
PUBLIC_DIRS: tuple[str, ...] = (
    'src/agents',
    'src/corpus',
)


def is_public(relative_path: str) -> bool:
    """¿La ruta está declarada como superficie?

    Un directorio declarado hace públicos sus hijos directos: el consumidor que
    recibe ``src/agents`` puede nombrar lo que hay dentro.
    """
    normalised = relative_path.strip().lstrip('./')
    if normalised in PUBLIC_PATHS or normalised in PUBLIC_DIRS:
        return True
    return any(normalised.startswith(d + '/') for d in PUBLIC_DIRS)
