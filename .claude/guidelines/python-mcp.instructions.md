# Python MCP — Guidelines

Reglas siempre activas para código Python del meta-framework THYROX.
Aplica a: `registry/mcp/*.py`, `registry/bootstrap.py`, cualquier `.py` en el proyecto.

---

## Regla 1: Type hints completos — sin `Any` innecesario

```python
# CORRECTO
def exec_cmd(cmd: str, cwd: str = ".", timeout: int = 60) -> ExecResult:
    ...

def retrieve_memory(query: str, top_k: int = 5) -> list[MemoryResult]:
    ...

# INCORRECTO
def exec_cmd(cmd, cwd=".", timeout=60):
    ...
```

---

## Regla 2: Dataclasses para retornos estructurados — no dicts crudos

```python
# CORRECTO
from dataclasses import dataclass

@dataclass
class ExecResult:
    stdout: str
    stderr: str
    returncode: int

# INCORRECTO — dict crudo sin tipado
def exec_cmd(...) -> dict:
    return {"stdout": ..., "stderr": ..., "returncode": ...}
```

---

## Regla 3: exec_cmd siempre con timeout y sin shell=True para comandos compuestos

```python
# CORRECTO — shell=True solo para comandos simples con timeout
result = subprocess.run(
    cmd,
    shell=True,
    capture_output=True,
    text=True,
    timeout=timeout,
    cwd=cwd,
)

# INCORRECTO — sin timeout (puede bloquear el MCP server indefinidamente)
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
```

---

## Regla 4: Bloquear patrones destructivos antes de exec_cmd

```python
import re

BLOCKED_PATTERNS = [
    r"rm\s+-rf\s+/",
    r">\s*/dev/sd",
    r"dd\s+if=.*of=/dev/",
    r"mkfs\.",
    r":\(\)\s*\{.*\}",  # fork bomb
]

def _is_safe_command(cmd: str) -> bool:
    return not any(re.search(p, cmd) for p in BLOCKED_PATTERNS)
```

---

## Regla 5: MCP servers — error en tool retorna dict con "error", nunca raise

```python
# CORRECTO — errores como datos, no excepciones
@server.tool()
async def exec_cmd_tool(cmd: str, cwd: str = ".") -> dict:
    try:
        result = adapter.exec_cmd(cmd, cwd)
        return {"stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode}
    except Exception as e:
        return {"error": str(e), "returncode": -1}

# INCORRECTO — raise rompe el MCP server
@server.tool()
async def exec_cmd_tool(cmd: str) -> dict:
    result = subprocess.run(cmd, ...)  # puede raise FileNotFoundError, etc.
    return result  # no captura excepciones
```

---

## Regla 6: Paths via pathlib — no string concatenation

```python
# CORRECTO
from pathlib import Path

index_path = Path(os.environ.get("MEMORY_INDEX_PATH", ".claude/memory/thyrox.faiss"))
index_path.parent.mkdir(parents=True, exist_ok=True)

# INCORRECTO
index_path = ".claude/memory/" + "thyrox.faiss"
os.makedirs(".claude/memory/", exist_ok=True)
```

---

## Regla 7: bootstrap.py — idempotencia obligatoria

```python
# CORRECTO — verificar antes de escribir
def write_agent(output_path: Path, content: str, force: bool = False) -> str:
    if output_path.exists() and not force:
        return f"skip: {output_path} ya existe (usar --force para sobreescribir)"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content)
    return f"ok: {output_path}"

# INCORRECTO — sobreescribe siempre sin avisar
output_path.write_text(content)
```

---

## Regla 8: Imports de EvoAgentX — solo via _evoagentx_adapter

```python
# CORRECTO — solo el adapter importa de evoagentx
# En _evoagentx_adapter.py:
from evoagentx.memory import LongTermMemory
from evoagentx.tools import CMDToolkit

# INCORRECTO — importar evoagentx directamente en los servers
# En memory_server.py:
from evoagentx.memory import LongTermMemory  # ← PROHIBIDO fuera del adapter
```

---

## Regla 9: Persistencia FAISS — guardar después de cada store

```python
# CORRECTO — persistir inmediatamente tras agregar
def store_memory(content: str, metadata: dict) -> str:
    vector = model.encode([content])
    index.add(vector)
    faiss.write_index(index, str(index_path))  # persistir siempre
    return str(uuid.uuid4())

# INCORRECTO — persistir solo al cerrar (se pierde si el proceso muere)
atexit.register(lambda: faiss.write_index(index, str(index_path)))
```

---

## Stack de dependencias (no agregar sin justificación)

```
mcp >= 0.9.0                  # MCP SDK Anthropic
evoagentx == 0.1.0            # pinned — no upgradear sin revisar adapter
faiss-cpu >= 1.7.4            # vector store (no faiss-gpu — sin torch)
sentence-transformers >= 2.2.0 # embeddings locales
pydantic >= 2.0               # validación de schemas
```

**Prohibido agregar:** `torch`, `tensorflow`, `fastapi`, `celery`, `redis`, `aiohttp`
(sin aprobación explícita en ADR — violaría restricciones del proyecto).
