#!/usr/bin/env python3
"""
Thyrox Bootstrap — One-shot installer para proyectos Claude Code.

Genera agentes nativos en .claude/agents/ a partir del registry YAML + templates,
y actualiza .mcp.json con los MCP servers de Thyrox.

Uso:
    python registry/bootstrap.py --stack react,nodejs,postgresql
    python registry/bootstrap.py --stack react --force
    python registry/bootstrap.py --stack react --model claude
"""

import argparse
import json
import os
import sys
from pathlib import Path


# ─── Constantes ──────────────────────────────────────────────────────────────

REGISTRY_DIR = Path(__file__).parent
PROJECT_ROOT = REGISTRY_DIR.parent
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"
MEMORY_DIR = PROJECT_ROOT / ".claude" / "memory"
MCP_JSON = PROJECT_ROOT / ".mcp.json"
PROJECT_STATE = PROJECT_ROOT / ".claude" / "context" / "project-state.md"

SUPPORTED_MODELS = ["claude"]
TECH_CATEGORIES = {
    "react": "frontend",
    "nodejs": "backend",
    "postgresql": "database",
    "python": "backend",
    "fastapi": "backend",
    "django": "backend",
    "mongodb": "database",
    "redis": "database",
}

CORE_AGENTS = ["task-planner", "task-executor", "tech-detector", "skill-generator"]

MCP_SERVERS = {
    "thyrox-memory": {
        "command": "python",
        "args": ["registry/mcp/memory_server.py"],
        "env": {
            "MEMORY_INDEX_PATH": ".claude/memory/thyrox.faiss"
        }
    },
    "thyrox-executor": {
        "command": "python",
        "args": ["registry/mcp/executor_server.py"]
    }
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def read_project_name() -> str:
    """Lee el nombre del proyecto desde project-state.md, o retorna placeholder."""
    if PROJECT_STATE.exists():
        content = PROJECT_STATE.read_text()
        for line in content.splitlines():
            if line.lower().startswith("# ") or "nombre:" in line.lower() or "name:" in line.lower():
                name = line.lstrip("#").strip().split(":")[-1].strip()
                if name:
                    return name
    return "{{PROJECT_NAME}}"


def read_yaml_frontmatter(path: Path) -> dict:
    """
    Extrae el bloque YAML de un archivo Markdown con frontmatter.
    Soporta tanto --- como el bloque de código ```yml.
    Retorna dict con las claves encontradas.
    """
    if not path.exists():
        return {}

    content = path.read_text()
    result = {}

    # Intentar frontmatter estándar ---
    if content.startswith("---"):
        lines = content.splitlines()
        end = -1
        for i, line in enumerate(lines[1:], 1):
            if line.strip() == "---":
                end = i
                break
        if end > 0:
            for line in lines[1:end]:
                if ":" in line:
                    key, _, val = line.partition(":")
                    result[key.strip()] = val.strip()
        return result

    # Intentar bloque ```yml
    import re
    match = re.search(r"```ya?ml\s*\n(.*?)\n```", content, re.DOTALL)
    if match:
        for line in match.group(1).splitlines():
            if ":" in line:
                key, _, val = line.partition(":")
                result[key.strip()] = val.strip()

    return result


def parse_tools_from_yml(yml_path: Path) -> list[str]:
    """Extrae la lista de tools del YAML del registry."""
    if not yml_path.exists():
        return []

    content = yml_path.read_text()
    tools = []
    in_tools = False

    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("tools:"):
            in_tools = True
            continue
        if in_tools:
            if stripped.startswith("-"):
                tools.append(stripped.lstrip("- ").strip())
            elif stripped and not stripped.startswith("#"):
                # Otra clave YAML — salir del bloque tools
                in_tools = False

    return tools


def parse_system_prompt(yml_path: Path) -> str:
    """Extrae el system_prompt del YAML del registry."""
    if not yml_path.exists():
        return ""

    content = yml_path.read_text()
    lines = content.splitlines()
    in_prompt = False
    prompt_lines = []
    indent = 0

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("system_prompt:"):
            in_prompt = True
            rest = stripped[len("system_prompt:"):].strip()
            if rest and rest not in ("|", ">"):
                return rest
            # Bloque multilínea — detectar indentación
            indent = len(line) - len(line.lstrip()) + 2
            continue
        if in_prompt:
            if line and not line.startswith(" " * indent) and not line.startswith("\t"):
                break
            prompt_lines.append(line[indent:] if len(line) > indent else line)

    return "\n".join(prompt_lines).strip()


def parse_field(yml_path: Path, field: str) -> str:
    """Extrae un campo simple del YAML."""
    if not yml_path.exists():
        return ""

    content = yml_path.read_text()
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith(f"{field}:"):
            return stripped[len(f"{field}:"):].strip()
    return ""


# ─── Generadores ─────────────────────────────────────────────────────────────

def generate_agent_md(name: str, description: str, model: str, tools: list[str], body: str) -> str:
    """Genera el contenido de un archivo .claude/agents/*.md."""
    tools_yaml = "\n".join(f"  - {t}" for t in tools)
    return f"""---
name: {name}
description: {description}
model: {model}
tools:
{tools_yaml}
---

{body}
"""


def install_core_agents(force: bool, model: str) -> list[str]:
    """
    Instala los 4 agentes core desde .claude/agents/ ya existentes.
    Si el archivo ya existe y no hay --force, reporta skip.
    Retorna lista de agentes instalados.
    """
    installed = []
    source_dir = AGENTS_DIR

    # Los agentes core ya existen como .md en .claude/agents/
    # Solo verificar que están presentes con frontmatter correcto
    for agent_name in CORE_AGENTS:
        agent_path = source_dir / f"{agent_name}.md"
        if agent_path.exists():
            if not force:
                print(f"  ✓ {agent_name:<20} → ya existe — skip")
            else:
                print(f"  ✓ {agent_name:<20} → ya existe (--force: manteniendo)")
            installed.append(agent_name)
        else:
            print(f"  ✗ {agent_name:<20} → no encontrado en .claude/agents/")

    return installed


def install_tech_agent(tech: str, force: bool, model: str, project_name: str) -> bool:
    """
    Genera .claude/agents/{tech}-expert.md desde registry YAML + template.
    Retorna True si se generó, False si se saltó.
    """
    dest = AGENTS_DIR / f"{tech}-expert.md"

    if dest.exists() and not force:
        print(f"  ✓ {tech}-expert{' ' * max(0, 18 - len(tech))} → ya existe — skip")
        return False

    # Buscar YAML en registry
    yml_path = REGISTRY_DIR / "agents" / f"{tech}-expert.yml"
    if not yml_path.exists():
        print(f"  ✗ {tech}-expert{' ' * max(0, 18 - len(tech))} → no hay YAML en registry/agents/{tech}-expert.yml")
        return False

    # Leer campos del YAML
    name = parse_field(yml_path, "name") or f"{tech}-expert"
    description = parse_field(yml_path, "description") or f"Experto en {tech}"
    tools = parse_tools_from_yml(yml_path)
    system_prompt = parse_system_prompt(yml_path)

    # Buscar template de skill
    category = TECH_CATEGORIES.get(tech, "")
    template_body = ""
    if category:
        template_path = REGISTRY_DIR / category / f"{tech}.skill.template.md"
        if template_path.exists():
            template_body = template_path.read_text()
            template_body = template_body.replace("{{PROJECT_NAME}}", project_name)

    # Componer body: system_prompt + template
    body_parts = []
    if system_prompt:
        body_parts.append(system_prompt)
    if template_body:
        body_parts.append(template_body)

    body = "\n\n---\n\n".join(body_parts) if body_parts else f"# {name}\n\nAgente experto en {tech}."

    # Escribir el archivo
    content = generate_agent_md(name, description, model, tools, body)
    dest.write_text(content)
    action = "sobreescrito" if dest.exists() else "creado"
    print(f"  ✓ {tech}-expert{' ' * max(0, 18 - len(tech))} → .claude/agents/{tech}-expert.md ({action})")
    return True


def update_mcp_json(force: bool) -> None:
    """Actualiza .mcp.json con los MCP servers de Thyrox."""
    existing = {}
    if MCP_JSON.exists():
        try:
            existing = json.loads(MCP_JSON.read_text())
        except json.JSONDecodeError:
            existing = {}

    mcp_servers = existing.get("mcpServers", {})

    changed = False
    for server_name, config in MCP_SERVERS.items():
        if server_name not in mcp_servers or force:
            mcp_servers[server_name] = config
            changed = True

    if changed:
        existing["mcpServers"] = mcp_servers
        MCP_JSON.write_text(json.dumps(existing, indent=2) + "\n")
        print(f"  ✓ .mcp.json actualizado con thyrox-memory y thyrox-executor")
    else:
        print(f"  ✓ .mcp.json — MCP servers ya configurados — skip")


def ensure_memory_dir() -> None:
    """Crea .claude/memory/ si no existe."""
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Thyrox Bootstrap — inicializa agentes y MCP servers para Claude Code"
    )
    parser.add_argument(
        "--stack",
        required=True,
        help="Stack de tecnologías separadas por coma (ej: react,nodejs,postgresql)"
    )
    parser.add_argument(
        "--model",
        default="claude",
        help="Modelo a usar para los agentes (default: claude)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Sobreescribir agentes existentes"
    )

    args = parser.parse_args()

    # Validar modelo
    if args.model not in SUPPORTED_MODELS:
        print(f"ERROR: modelo '{args.model}' no soportado en v3.")
        print(f"       Modelos soportados: {', '.join(SUPPORTED_MODELS)}")
        if args.model == "openai":
            print("       modelo openai no soportado en v3 — usar --model claude")
        return 1

    # Parsear stack
    techs = [t.strip().lower() for t in args.stack.split(",") if t.strip()]
    if not techs:
        print("ERROR: --stack no puede estar vacío")
        return 1

    project_name = read_project_name()

    print(f"\nThyrox Bootstrap v3")
    print(f"Stack: {', '.join(techs)}")
    print(f"Model: {args.model}")
    print(f"Force: {args.force}")
    print(f"Proyecto: {project_name}")
    print()

    # 1. Crear directorios necesarios
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    ensure_memory_dir()

    # 2. Agentes core
    print("Agentes core:")
    install_core_agents(force=args.force, model=args.model)
    print()

    # 3. Agentes de tecnología
    print("Agentes de tecnología:")
    tech_installed = 0
    for tech in techs:
        installed = install_tech_agent(
            tech=tech,
            force=args.force,
            model=args.model,
            project_name=project_name,
        )
        if installed:
            tech_installed += 1
    print()

    # 4. MCP servers
    print("MCP Servers:")
    update_mcp_json(force=args.force)
    print()

    # 5. Resumen
    total_agents = len(CORE_AGENTS) + tech_installed
    print(f"Bootstrap completado.")
    print(f"  Agentes core:       {len(CORE_AGENTS)}")
    print(f"  Agentes de tech:    {tech_installed}/{len(techs)}")
    print(f"  Total en .claude/agents/: {len(list(AGENTS_DIR.glob('*.md')))}")
    print()
    print("Siguiente paso: reinicia Claude Code para activar los agentes y MCP servers.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
