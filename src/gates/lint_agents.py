#!/usr/bin/env python3
"""
lint_agents.py — validador del frontmatter de los agentes nativos.

Valida los ``.claude/agents/*.md`` contra el esquema sombra del frontmatter
que el ejecutable declara ``.strict()`` — 20 claves en 2.1.258, medidas en
``.claude/eventos/flujo-carga-agentes-20260902T044544/salidas/`` y citadas en
``analisis-flujo-carga-de-agentes-en-el-binario.rst``:

  - OBLIGATORIAS: ``name`` y ``description`` (las únicas que el cliente exige;
    ``tools`` es opcional — omitirla significa «todas»).
  - ADMITIDAS: las 18 restantes del esquema, ``model`` incluida. El emisor
    de ``@thyrox/agent`` la escribe con el identificador completo del
    catálogo; prohibirla aquí contradecía el contrato (H-DOCS-1006).
  - DESCONOCIDAS: cualquier otra clave dispara en el cliente
    ``tengu_frontmatter_shadow_unknown_key`` y se ignora. Aquí es ERROR,
    salvo ``updated_at``, que el emisor escribe a propósito y cuyo destino
    decide el ejecutor (queda como WARN hasta esa decisión).
  - ``description``: no vacía, >= 20 caracteres; WARN si no sigue
    «{qué hace}. Usar cuando {condición}.»

Uso:
  python3 lint_agents.py                    # todos los .claude/agents/*.md
  python3 lint_agents.py ruta/agente.md     # archivos concretos
"""

import sys
import re
from pathlib import Path

REQUIRED_FIELDS = {"name", "description"}
# Las 20 claves del esquema sombra, en el orden en que el ejecutable las declara.
FRONTMATTER_KEYS = (
    "name", "description", "model", "tools", "disallowedTools", "color",
    "effort", "permissionMode", "mcpServers", "hooks", "maxTurns", "skills",
    "initialPrompt", "memory", "background", "isolation", "observer",
    "observerMessage", "observeSubagents", "experimental",
)
# Escritas por nuestro emisor y ajenas al esquema: el cliente las ignora con
# un evento de telemetría. Se avisan, no se rechazan (decisión pendiente).
TOLERATED_UNKNOWN_KEYS = {"updated_at"}
DESCRIPTION_MIN_CHARS = 20
USAR_CUANDO_PATTERN = re.compile(r".+\.\s*[Uu]sar cuando .+", re.DOTALL)


def find_agents(paths: list[str]) -> list[Path]:
    """Resolve the list of agent files to validate."""
    if paths:
        files = []
        for p in paths:
            path = Path(p)
            if path.is_file():
                files.append(path)
            elif path.is_dir():
                files.extend(sorted(path.glob("*.md")))
            else:
                print(f"Warning: path not found — {p}", file=sys.stderr)
        return files
    # Default: .claude/agents/*.md relative to cwd
    agents_dir = Path(".claude/agents")
    if not agents_dir.exists():
        print(f"Error: directory not found — {agents_dir}", file=sys.stderr)
        sys.exit(2)
    return sorted(agents_dir.glob("*.md"))


def parse_frontmatter(text: str) -> tuple[dict | None, list[str]]:
    """
    Extract YAML frontmatter from a markdown file.
    Returns (fields_dict, parse_errors).
    fields_dict is None if no frontmatter block found.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, ["no frontmatter block found (file does not start with '---')"]

    end_idx = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        return None, ["frontmatter block not closed (missing closing '---')"]

    frontmatter_lines = lines[1:end_idx]
    fields: dict = {}
    parse_errors: list[str] = []
    current_key: str | None = None
    list_values: list[str] = []

    i = 0
    while i < len(frontmatter_lines):
        line = frontmatter_lines[i]

        # List item under current key
        if line.startswith("  - ") and current_key is not None:
            list_values.append(line[4:].strip())
            i += 1
            continue

        # Clave anidada (dos espacios sin guion): cuelga de la clave anterior;
        # sólo `experimental` la usa en el esquema sombra.
        if line.startswith("  ") and not line.startswith("  - ") and ":" in line and current_key is not None:
            sub_key, _, sub_value = line.strip().partition(":")
            parent = fields.get(current_key)
            if not isinstance(parent, dict):
                parent = {}
            parent[sub_key.strip()] = sub_value.strip()
            fields[current_key] = parent
            i += 1
            continue

        # New key
        if ":" in line:
            # Flush previous list
            if current_key is not None and list_values:
                fields[current_key] = list_values
                list_values = []

            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()

            # Detect block scalar `>` or `|`
            if value in (">", "|", ">-", "|-", ">+", "|+"):
                # Collect indented lines that follow
                block_lines = []
                i += 1
                while i < len(frontmatter_lines):
                    next_line = frontmatter_lines[i]
                    if next_line.startswith("  ") or next_line == "":
                        block_lines.append(next_line.strip())
                        i += 1
                    else:
                        break
                fields[key] = " ".join(bl for bl in block_lines if bl).strip()
                current_key = None
                continue
            else:
                fields[key] = value
                current_key = key

        i += 1

    # Flush trailing list
    if current_key is not None and list_values:
        fields[current_key] = list_values

    return fields, parse_errors


def validate_agent(file_path: Path) -> tuple[list[str], list[str]]:
    """
    Validate a single agent file.
    Returns (errors, warnings).
    """
    errors: list[str] = []
    warnings: list[str] = []

    try:
        text = file_path.read_text(encoding="utf-8")
    except OSError as e:
        return [f"cannot read file: {e}"], []

    fields, parse_errors = parse_frontmatter(text)
    if parse_errors:
        return [f"frontmatter parse error: {e}" for e in parse_errors], []
    if fields is None:
        return ["no frontmatter block found"], []

    # --- REQUIRED fields ---
    for req in sorted(REQUIRED_FIELDS):
        if req not in fields:
            errors.append(f"missing required field '{req}'")

    # --- claves fuera del esquema sombra ---
    for key in fields:
        if key in FRONTMATTER_KEYS:
            continue
        if key in TOLERATED_UNKNOWN_KEYS:
            warnings.append(
                f"clave '{key}' fuera del esquema sombra: el cliente la ignora "
                f"(tengu_frontmatter_shadow_unknown_key); destino pendiente del ejecutor"
            )
        else:
            errors.append(
                f"clave '{key}' fuera del esquema sombra de 20 claves — el cliente la ignora"
            )

    # --- description quality ---
    if "description" in fields:
        desc = fields["description"]

        # Block scalar with empty content produces empty string
        if desc == "" or desc is None:
            errors.append(
                "description is empty (block scalar '>' with no content) — "
                "agent is invisible for routing"
            )
        elif len(desc) < DESCRIPTION_MIN_CHARS:
            errors.append(
                f"description too short ({len(desc)} chars, minimum {DESCRIPTION_MIN_CHARS}) — "
                f"value: '{desc}'"
            )
        else:
            # Check recommended pattern (WARN only)
            if not USAR_CUANDO_PATTERN.match(desc):
                warnings.append(
                    f"description does not follow recommended pattern "
                    f"'{{qué hace}}. Usar cuando {{condición}}.' — "
                    f"value: '{desc[:60]}...'" if len(desc) > 60 else
                    f"description does not follow recommended pattern "
                    f"'{{qué hace}}. Usar cuando {{condición}}.' — "
                    f"value: '{desc}'"
                )

    # --- tools: si se declara, lista no vacía (vacía = «ninguna herramienta»,
    # que el cliente admite pero ningún agente nuestro quiere) ---
    if "tools" in fields:
        tools_val = fields["tools"]
        if not isinstance(tools_val, list) or len(tools_val) == 0:
            errors.append("'tools' field must be a non-empty list")

    # --- experimental.cacheTtl: sólo "5m" o "1h" ---
    exp = fields.get("experimental")
    if isinstance(exp, dict) and "cacheTtl" in exp:
        ttl = exp["cacheTtl"].strip('"')
        if ttl not in ("5m", "1h"):
            errors.append(f"experimental.cacheTtl debe ser \"5m\" o \"1h\", no '{ttl}'")

    return errors, warnings


def main() -> int:
    args = sys.argv[1:]
    files = find_agents(args)

    if not files:
        print("No agent files found.")
        return 0

    total = len(files)
    total_errors = 0
    total_warnings = 0

    for file_path in files:
        errors, warnings = validate_agent(file_path)
        total_errors += len(errors)
        total_warnings += len(warnings)

        if not errors and not warnings:
            print(f"[OK] {file_path}")
        elif not errors and warnings:
            print(f"[OK] {file_path} ({len(warnings)} warning(s))")
            for w in warnings:
                print(f"    WARN: {w}")
        else:
            print(f"[FAIL] {file_path}: {len(errors)} error(s), {len(warnings)} warning(s)")
            for e in errors:
                print(f"    ERROR: {e}")
            for w in warnings:
                print(f"    WARN: {w}")

    print()
    print(
        f"{total} file(s) checked, {total_errors} error(s), {total_warnings} warning(s)"
    )

    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
