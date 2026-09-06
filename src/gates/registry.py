#!/usr/bin/env python3
"""El registro de gates: qué sabemos verificar, y contra qué regla.

Fuente única, como `ccnmt: scripts/doctor-architecture.ts` la tiene. Antes
esto vivía disperso en 1126 líneas de `thyrox-audit.sh`, con cada gate en su
propio bloque `if [[ -f … ]]` y su aviso escrito a mano; ahí no se podía
preguntar «¿cuántos gates hay?» sin leer el guion entero.

**Cuando se añade un `check_*` a `src/gates/`, se registra aquí.** El control
que lo obliga vive en `tests/gates/test_doctor.py`.

El campo `doc` no es decoración: nombra la regla contra la que el gate mide.
Sin él, un fallo dice que algo está mal y no contra qué — y **15 de los 39
gates no la declaraban en su cabecera** cuando se escribió este registro.

Las cuatro capas salen de QUÉ mide cada gate, no de dónde vive su archivo:

  Prosa        el corpus del consumidor (`source/**.rst`, `.claude/rules/**`)
  Herramienta  los guiones y hooks: su forma, su veredicto, su alcance
  Alcance      el multi-repo — raíces, consumo, referencia
  Paquete      el código de thyrox y sus artefactos derivados
"""
from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from gates.doctor import Check  # noqa: E402

CHECKS: list[Check] = [
    # ── Prosa ───────────────────────────────────────────────────────────
    Check('rst-sintaxis', 'Prosa', 'rst', 'check_rst_sintaxis.py',
          'sintaxis RST contra el motor real de Sphinx'),
    Check('rst-convenciones', 'Prosa', 'rst', 'check_rst_convenciones.py',
          'auto-audit-before-writing.md — autoría canónica y list-table'),
    Check('rst-referencias', 'Prosa', 'rst', 'check_rst_referencias.py',
          ':ref:`h-docs-92` — un :ref: sin etiqueta resuelve al vacío'),
    Check('vocabulario-prosa', 'Prosa', 'lexico', 'check_vocabulario_prosa.py',
          'redaccion-tecnica-es.md — forma vetada y sustantivo inventado'),
    Check('hallazgos-index', 'Prosa', 'hallazgo', 'check_hallazgos_index.py',
          'coherencia del index de hallazgos: su tabla contra su toctree'),
    Check('hallazgo-submodulo', 'Prosa', 'hallazgo', 'check_hallazgo_submodulo.py',
          'H-DOCS-226 — la capa se declara tres veces y las tres coinciden'),
    Check('hallazgo-sucesor', 'Prosa', 'hallazgo', 'check-hallazgo-sucesor.sh',
          'hallazgo-abierto-genera-sucesor.md — alcance abierto sin dueño'),
    Check('ids-duplicados', 'Prosa', 'identidad', 'check-ids-duplicados.sh',
          'H-DOCS-119 — dos etiquetas iguales: el :ref: resuelve al equivocado'),
    Check('ids-entre-ramas', 'Prosa', 'identidad', 'check_ids_entre_ramas.py',
          'colisión de identificador entre dos ramas que avanzan a la vez'),
    Check('artefactos-minimos', 'Prosa', 'iniciativa', 'check-artefactos-minimos.sh',
          'DEC-AM-01 — index, alcance con Premisa, progreso según :estado:'),
    Check('fr-admin-coverage', 'Prosa', 'iniciativa', 'check-fr-admin-coverage.sh',
          'H-DOCS-01 — cobertura de los FR derivados de admin'),
    Check('cifra-de-artefacto-vivo', 'Prosa', 'calibracion', 'check_cifra_de_artefacto_vivo.py',
          'calibration-verified-numbers.md — una cifra que vive en código no se transcribe'),
    Check('unreachable-rules', 'Prosa', 'gobierno', 'check_unreachable_rules.py',
          'H-DOCS-479 — una regla que ninguna sesión carga es capacidad muerta'),
    Check('evidence-tracked', 'Prosa', 'evidencia', 'check_evidence_tracked.py',
          'H-DOCS-120 — la evidencia citada existe y está versionada'),

    # ── Herramienta ─────────────────────────────────────────────────────
    Check('script-naming', 'Herramienta', 'guion', 'check_script_naming.py',
          'convention-naming.md — `import mi-guion` no existe: snake_case en .py'),
    Check('script-deprecated', 'Herramienta', 'guion', 'check_script_deprecated.py',
          'el dueño canónico es thyrox; un guion mudado declara su deprecación'),
    Check('byte-oriented-class', 'Herramienta', 'guion', 'check_byte_oriented_class.py',
          'una clase con multibyte en herramienta de BYTE no casa lo que promete'),
    Check('veredicto-de-gate', 'Herramienta', 'gate', 'check_veredicto_de_gate.py',
          'metrica-decide-la-conclusion.md — un gate no colapsa el rechazo en un 0'),
    Check('suite-discrimina', 'Herramienta', 'gate', 'check_suite_discrimina.py',
          ':ref:`h-docs-224` — un control que no puede fallar no es un control'),
    Check('generator-determinism', 'Herramienta', 'gate', 'check_generator_determinism.py',
          'una segunda ejecución reproduce el artefacto byte a byte'),
    Check('mutante-en-staging', 'Herramienta', 'gate', 'check_mutante_en_staging.py',
          'H-DOCS-466 — un mutante de sabotaje no se commitea'),
    Check('error-catalog', 'Herramienta', 'gate', 'check_error_catalog.py',
          'DEC-ERR-01 — el catálogo de errores es la fuente, no el literal'),
    Check('premise-drift', 'Herramienta', 'premisa', 'check_premise_drift.py',
          'los veredictos de la cadena de premisas que CAMBIARON'),
    Check('hooks-timeout', 'Herramienta', 'hook', 'check_hooks_timeout.py',
          'todo hook acota su peor caso: el turno lo espera'),
    Check('hook-script-token', 'Herramienta', 'hook', 'check_hook_script_token.py',
          ':ref:`h-docs-1074` — el token del guion que el hook invoca'),
    Check('eventos-hook', 'Herramienta', 'hook', 'check_eventos_hook.py',
          'un nombre de evento mal escrito no da error: el hook no dispara'),
    Check('githooks-activos', 'Herramienta', 'hook', 'check_githooks_activos.py',
          ':ref:`h-api-858` — core.hooksPath no se versiona; sin él, saltados'),
    Check('config-precedence', 'Herramienta', 'config', 'check_config_precedence.py',
          'la precedencia se deriva recorriendo ramas, no líneas'),

    # ── Alcance ─────────────────────────────────────────────────────────
    Check('reference-root-resolution', 'Alcance', 'referencia', 'check_reference_root_resolution.py',
          'la ruta de un addon de la referencia se pide, no se compone'),
    Check('corpus-al-dia', 'Alcance', 'referencia', 'check_corpus_al_dia.py',
          ':ref:`h-docs-434` — el corpus vendorizado contra el ejecutable vivo'),
    Check('binary-literal-citations', 'Alcance', 'referencia', 'check_binary_literal_citations.py',
          'H-DOCS-211 — un literal del ejecutable se cita con su versión'),
    Check('consumer-copies', 'Alcance', 'consumo', 'check_consumer_copies.py',
          'thyrox se consume, no se copia: una copia diverge en silencio'),
    Check('gitattributes', 'Alcance', 'git', 'check_gitattributes.py',
          ':ref:`h-docs-1074` — el driver de merge declarado y activo'),
    Check('branch-commit-messages', 'Alcance', 'git', 'check_branch_commit_messages.sh',
          'commit-conventions.md — los commits de la rama contra el hook'),

    # ── Paquete ─────────────────────────────────────────────────────────
    Check('agent-artifacts', 'Paquete', 'agent', 'check-agent-artifacts.sh',
          'el .md de un agente es DERIVADO — mismo criterio que makemigrations --check'),
    Check('agent-isolation', 'Paquete', 'agent', 'check_agent_isolation.py',
          'H-DOCS-311 — el aislamiento del working tree entre agentes'),
    Check('harness-typecheck', 'Paquete', 'harness', 'check-harness-typecheck.sh',
          'el paquete typechequea antes de publicarse'),
    Check('i001-prewrite', 'Paquete', 'thyrox', 'check-i001-prewrite.sh',
          'I-001 — DISCOVER antes de planificar'),
    Check('workflow-refutacion', 'Paquete', 'thyrox', 'check-workflow-refutacion.sh',
          ':ref:`h-docs-101` — un workflow declara su fase de refutación y aborta'),
]
