#!/usr/bin/env python3
"""
migrate-metadata-keys.py — Migra keys de metadata YAML de español a inglés.

Transforma únicamente el bloque frontmatter YAML (entre ```yml y ```)
sin tocar el cuerpo del documento markdown.

Uso:
  python migrate-metadata-keys.py --layer 1 [--dry-run]
  python migrate-metadata-keys.py --layer 1 --layer 3 [--dry-run]
  python migrate-metadata-keys.py --file path/to/file.md [--dry-run]
  python migrate-metadata-keys.py --all [--dry-run]
  python migrate-metadata-keys.py --verify-only [--layer N | --all]
"""

import argparse
import re
import sys
from pathlib import Path

# Raíz del proyecto — dos niveles arriba de scripts/
ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent

ASSETS_DIR     = ROOT / ".claude/skills/pm-thyrox/assets"
REFERENCES_DIR = ROOT / ".claude/skills/pm-thyrox/references"
SKILL_FILE     = ROOT / ".claude/skills/pm-thyrox/SKILL.md"
CONVENTIONS    = ROOT / ".claude/skills/pm-thyrox/references/conventions.md"
CLAUDE_MD      = ROOT / ".claude/CLAUDE.md"
CONTEXT_ACTIVE = [
    ROOT / ".claude/context/focus.md",
    ROOT / ".claude/context/now.md",
    ROOT / ".claude/context/project-state.md",
    ROOT / ".claude/context/technical-debt.md",
    ROOT / ".claude/context/decisions.md",
]
ADRS_DIR       = ROOT / ".claude/context/decisions"
ERRORS_DIR     = ROOT / ".claude/context/errors"
WP_ACTIVE      = ROOT / ".claude/context/work/2026-04-05-01-09-22-thyrox-capabilities-integration"

# Capas de migración
LAYERS = {
    1: lambda: list(ASSETS_DIR.glob("*.template")),
    2: lambda: list(REFERENCES_DIR.glob("*.md")),
    3: lambda: [SKILL_FILE, CONVENTIONS],
    4: lambda: [f for f in CONTEXT_ACTIVE if f.exists()],
    5: lambda: sorted(ADRS_DIR.glob("adr-*.md")),
    6: lambda: sorted(ERRORS_DIR.glob("ERR-*.md")),
    7: lambda: list(WP_ACTIVE.rglob("*.md")) if WP_ACTIVE.exists() else [],
}

# Patrones para detectar keys en español en frontmatter
SPANISH_KEY_PATTERNS = [
    r"^Tipo:", r"^Categoría:", r"^Versión:", r"^Propósito:", r"^Objetivo:",
    r"^Fase:", r"^Estado:", r"^Autor:", r"^Proyecto:", r"^Activar si:",
    r"^Fecha ", r"^Fecha:", r"^Última ", r"^Total ", r"^Responsable",
    r"^Revisor", r"^Aprobado por:", r"^Validado por:", r"^Severidad:",
    r"^Clasificación:", r"^Riesgos ", r"^Estimacion ",
]

# KEY_MAP: español → inglés
# ORDEN CRÍTICO: keys más largos primero para evitar sustituciones parciales
# (ej: "Fecha creación" debe aplicarse antes que "Fecha")
KEY_MAP_RAW = {
    # Grupo A — universales
    "Tipo": "type",
    "Categoría": "category",
    "Versión": "version",
    "Propósito": "purpose",
    "Objetivo": "goal",
    "Fase": "phase",
    "Estado": "status",
    "Autor": "author",
    "Proyecto": "project",
    "Activar si": "activate_if",
    "ID": "id",
    "Sistema": "system",
    "Uso": "usage",
    "Herramientas": "tools",
    "Formato": "format",
    "Ejemplos": "examples",
    "WP": "wp",
    "Scope": "scope",
    "Epic": "epic",
    "Feature": "feature",
    "Rama": "branch",

    # Grupo B — fechas (más largos primero es crítico aquí)
    "Fecha última actualización": "updated_at",
    "Fecha creación tareas": "created_at",
    "Fecha inicio categorización": "started_at",
    "Fecha inicio correcciones": "started_at",
    "Fecha fin correcciones": "ended_at",
    "Fecha inicio prevista": "planned_start",
    "Fecha fin prevista": "planned_end",
    "Fecha inicio estimada": "estimated_start",
    "Fecha fin estimada": "estimated_end",
    "Fecha inicio sesión": "session_started_at",
    "Fecha fin sesión": "session_ended_at",
    "Fecha identificación": "created_at",
    "Fecha actualización": "updated_at",
    "Última actualización": "updated_at",
    "Fecha completación": "completed_at",
    "Fecha estrategia": "created_at",
    "Fecha creación": "created_at",
    "Fecha documento": "created_at",
    "Fecha análisis": "created_at",
    "Fecha diseño": "created_at",
    "Fecha cierre": "closed_at",
    "Fecha inicio": "started_at",
    "Fecha plan": "created_at",
    "Fecha fin": "ended_at",
    "Fecha": "created_at",

    # Grupo C — contadores
    "Total issues a categorizar": "total_issues",
    "Total issues encontrados": "total_issues_found",
    "Total stakeholders": "total_stakeholders",
    "Total lecciones": "total_lessons",
    "Total tareas": "total_tasks",
    "Requisitos totales": "total_requirements",
    "Estimacion total": "total_estimate",
    "Riesgos mitigados": "mitigated_risks",
    "Riesgos abiertos": "open_risks",
    "Riesgos cerrados": "closed_risks",

    # Grupo D — roles
    "Responsable análisis": "analysis_owner",
    "Responsable implementación": "implementation_owner",
    "Responsable proceso": "process_owner",
    "Revisor designado": "assigned_reviewer",
    "Coordinación con": "coordination_with",
    "Responsable": "owner",
    "Revisor": "reviewer",
    "Aprobado por": "approved_by",
    "Validado por": "validated_by",
    "Corregido por": "fixed_by",
    "Reportado por": "reported_by",
    "Ejecutor": "executor",
    "Planificador": "planner",
    "Diseñador": "designer",
    "Arquitecto": "architect",
    "Creador tareas": "tasks_creator",

    # Grupo E — versiones y tracking
    "Versión Quality Goals": "quality_goals_version",
    "Versión stakeholder map": "stakeholder_map_version",
    "Versión categorización": "categorization_version",
    "Versión arquitectura": "architecture_version",
    "Versión constraints": "constraints_version",
    "Versión constitution": "constitution_version",
    "Versión requisitos": "requirements_version",
    "Versión breakdown": "breakdown_version",
    "Versión análisis": "analysis_version",
    "Versión contexto": "context_version",
    "Versión diseño": "design_version",
    "Versión reporte": "report_version",
    "Versión flujo": "flow_version",
    "Versión docs": "docs_version",
    "Fase de origen": "source_phase",
    "Fases activas": "active_phases",
    "Fase actual": "current_phase",
    "ID work package": "work_package_id",
    "Stack versión": "stack_version",

    # Grupo G — keys faltantes detectados en verify
    "Última actualización integración": "integration_updated_at",
    "Cambios relacionados a": "related_to",
    "Sistemas externos": "external_systems",
    "Última revisión": "last_reviewed_at",
    "Total archivos": "total_files",
    "Archivos modificados": "files_modified",
    "Archivos eliminados": "files_deleted",
    "Archivos agregados": "files_added",
    "Archivos docs": "docs_files",
    "Tests añadidos": "tests_added",
    "Tests pasando": "tests_passing",
    "Tests": "tests",

    # Grupo F — específicos de templates
    "Tiempo total sesión": "total_session_time",
    "Issues tratados hoy": "issues_handled_today",
    "Issues en progreso": "in_progress_issues",
    "Issues demorados": "delayed_issues",
    "Issues pendientes": "pending_issues",
    "Issues resueltos": "resolved_issues",
    "Dependencias críticas": "critical_dependencies",
    "Dependencias externas": "external_dependencies",
    "Tasa resolución": "resolution_rate",
    "Período evaluación": "evaluation_period",
    "Período vigencia": "validity_period",
    "Budget utilizado": "budget_used",
    "Horas dedicadas": "hours_spent",
    "Siguiente sesión": "next_session",
    "Clasificación": "classification",
    "Componentes": "components",
    "Componente": "component",
    "Severidad": "severity",
    "Recurrencia": "recurrence",
}

# Ordenar por longitud descendente — crítico para evitar sustituciones parciales
KEY_MAP = dict(sorted(KEY_MAP_RAW.items(), key=lambda x: len(x[0]), reverse=True))


def extract_frontmatter(content: str) -> tuple[str, str, str]:
    """
    Separa el contenido en (before_fm, frontmatter_block, after_fm).
    El frontmatter es el bloque entre ```yml (o ```yaml) y el ``` de cierre.
    Si no hay frontmatter, retorna ("", "", content).
    """
    pattern = re.compile(r"^(```(?:yml|yaml)\n)(.*?)(^```\n?)", re.MULTILINE | re.DOTALL)
    match = pattern.search(content)
    if not match:
        return "", "", content

    start = match.start()
    end = match.end()
    before = content[:start]
    fm_open = match.group(1)
    fm_body = match.group(2)
    fm_close = match.group(3)
    after = content[end:]

    return before, fm_open + fm_body + fm_close, after


def migrate_frontmatter(fm_block: str) -> tuple[str, list[tuple[str, str]]]:
    """
    Aplica KEY_MAP al bloque frontmatter.
    Retorna (fm_migrado, lista_de_cambios).
    """
    changes = []
    lines = fm_block.split("\n")
    new_lines = []

    for line in lines:
        new_line = line
        for es_key, en_key in KEY_MAP.items():
            # Matchear "EsKey: " o "EsKey:" al inicio de la línea
            pattern = re.compile(r"^(" + re.escape(es_key) + r")(\s*:)")
            if pattern.match(line):
                new_line = pattern.sub(en_key + r"\2", line, count=1)
                if new_line != line:
                    changes.append((es_key, en_key))
                break  # aplicar solo la primera coincidencia por línea
        new_lines.append(new_line)

    return "\n".join(new_lines), changes


def migrate_file(path: Path, dry_run: bool = False) -> tuple[bool, list[tuple[str, str]]]:
    """
    Migra un archivo. Retorna (modificado, cambios).
    """
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = path.read_text(encoding="latin-1")
        except Exception as e:
            print(f"  ERROR leyendo {path}: {e}")
            return False, []
    except Exception as e:
        print(f"  ERROR leyendo {path}: {e}")
        return False, []

    before, fm_block, after = extract_frontmatter(content)

    if not fm_block:
        return False, []

    new_fm, changes = migrate_frontmatter(fm_block)

    if not changes:
        return False, []

    new_content = before + new_fm + after

    if dry_run:
        print(f"\n  {path.relative_to(ROOT)}")
        for es_key, en_key in changes:
            print(f"    '{es_key}:' -> '{en_key}:'")
    else:
        path.write_text(new_content, encoding="utf-8")

    return True, changes


def verify_files(files: list[Path]) -> list[Path]:
    """
    Verifica que los archivos no tengan keys en español en frontmatter.
    Retorna lista de archivos con residuos.
    """
    problematic = []
    for path in files:
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        _, fm_block, _ = extract_frontmatter(content)
        if not fm_block:
            continue
        for pattern in SPANISH_KEY_PATTERNS:
            if re.search(pattern, fm_block, re.MULTILINE):
                problematic.append(path)
                break
    return problematic


def get_layer_files(layer: int) -> list[Path]:
    if layer not in LAYERS:
        print(f"ERROR: capa {layer} no existe. Capas válidas: 1-7")
        sys.exit(1)
    return LAYERS[layer]()


def run_migration(files: list[Path], dry_run: bool, label: str) -> int:
    """Ejecuta la migración sobre una lista de archivos. Retorna count de modificados."""
    modified = 0
    if dry_run:
        print(f"\n[DRY-RUN] {label} — {len(files)} archivos")
    else:
        print(f"\n[APPLY] {label} — {len(files)} archivos")

    for path in sorted(files):
        changed, changes = migrate_file(path, dry_run=dry_run)
        if changed:
            modified += 1
            if not dry_run:
                print(f"  OK  {path.relative_to(ROOT)} ({len(changes)} keys migrados)")

    label_action = "cambios detectados" if dry_run else "archivos modificados"
    print(f"  --> {modified} {label_action}")
    return modified


def run_verify(files: list[Path], label: str) -> bool:
    """Verifica ausencia de keys en español. Retorna True si todo OK."""
    problematic = verify_files(files)
    if problematic:
        print(f"\n[VERIFY FAIL] {label} — {len(problematic)} archivos con keys en español:")
        for p in problematic:
            print(f"  {p.relative_to(ROOT)}")
        return False
    else:
        print(f"\n[VERIFY OK] {label} — cero keys en español")
        return True


def main():
    parser = argparse.ArgumentParser(description="Migra keys YAML de español a inglés en frontmatter markdown.")
    parser.add_argument("--layer", type=int, action="append", metavar="N",
                        help="Capa(s) a migrar (1-7). Puede repetirse: --layer 1 --layer 2")
    parser.add_argument("--file", type=Path, metavar="PATH",
                        help="Migrar un archivo específico")
    parser.add_argument("--all", action="store_true",
                        help="Migrar todas las capas en orden")
    parser.add_argument("--dry-run", action="store_true",
                        help="Mostrar cambios sin aplicar")
    parser.add_argument("--verify-only", action="store_true",
                        help="Solo verificar, sin migrar")

    args = parser.parse_args()

    if not any([args.layer, args.file, args.all]):
        parser.print_help()
        sys.exit(1)

    all_ok = True

    if args.file:
        path = args.file if args.file.is_absolute() else ROOT / args.file
        if not path.exists():
            print(f"ERROR: archivo no encontrado: {path}")
            sys.exit(1)
        if args.verify_only:
            all_ok = run_verify([path], str(path.relative_to(ROOT)))
        else:
            run_migration([path], args.dry_run, str(path.relative_to(ROOT)))

    elif args.all:
        layers = sorted(LAYERS.keys())
        for layer in layers:
            files = get_layer_files(layer)
            label = f"Capa {layer}"
            if args.verify_only:
                ok = run_verify(files, label)
                all_ok = all_ok and ok
            else:
                run_migration(files, args.dry_run, label)
                if not args.dry_run:
                    run_verify(files, label)

    elif args.layer:
        for layer in sorted(set(args.layer)):
            files = get_layer_files(layer)
            label = f"Capa {layer}"
            if args.verify_only:
                ok = run_verify(files, label)
                all_ok = all_ok and ok
            else:
                run_migration(files, args.dry_run, label)
                if not args.dry_run:
                    run_verify(files, label)

    if args.verify_only:
        sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
