# HITL Interrupt/Resume — AP-17

## Anti-patrón
```python
# INCORRECTO
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

async def flag_for_review(
    action_description: str,
    action_data: dict,
) -> dict:
    """Marca una acción para revisión humana."""
    # Solo persiste el flag — no hay mecanismo de bloqueo
    await db.save({
        "action": action_description,
        "data": action_data,
        "flagged": True,
        "reviewed": False,
    })
    # ERROR: retorna inmediatamente, el agente continúa sin esperar
    return {
        "status": "flagged",
        "message": "Acción marcada para revisión",
    }

class ReviewAgent(LlmAgent):
    tools = [FunctionTool(func=flag_for_review)]
    # El agente ve "flagged" como confirmación y prosigue con acciones irreversibles
```

**Por qué falla:** `flag_for_review` persiste un registro y retorna `{"status": "flagged"}`, pero no interrumpe la ejecución del agente. El agente interpreta el retorno como completación exitosa y continúa al siguiente paso. El humano puede revisar el flag en la base de datos, pero el agente ya ejecutó las acciones posteriores. El HITL es decorativo: existe en los datos, no en el flujo de control. La función se llama "flag for review" pero no implementa ningún mecanismo de interrupt/resume real.

## Patrón correcto
```python
# CORRECTO
import asyncio
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Registro de interrupciones activas
_interrupts: dict[str, asyncio.Event] = {}
_resolutions: dict[str, dict] = {}

async def flag_for_review(
    action_description: str,
    action_data: dict,
    timeout_seconds: int = 600,
) -> dict:
    """
    Interrumpe el agente hasta que un humano apruebe o rechace la acción.
    El agente no puede continuar hasta recibir resolución explícita.
    """
    interrupt_id = await db.save({
        "action": action_description,
        "data": action_data,
        "status": "pending_review",
    })
    await notify_reviewers(interrupt_id, action_description)

    # Crear punto de interrupción
    resume_event = asyncio.Event()
    _interrupts[interrupt_id] = resume_event

    try:
        # BLOQUEAR — el agente no avanza hasta resolución humana
        await asyncio.wait_for(resume_event.wait(), timeout=timeout_seconds)
        resolution = _resolutions.get(interrupt_id, {})
        approved = resolution.get("approved", False)

        await db.update(interrupt_id, {
            "status": "approved" if approved else "rejected",
            "reviewer_notes": resolution.get("notes", ""),
        })

        return {
            "status": "approved" if approved else "rejected",
            "interrupt_id": interrupt_id,
            "reviewer_notes": resolution.get("notes", ""),
            "can_proceed": approved,
        }
    except asyncio.TimeoutError:
        await db.update(interrupt_id, {"status": "timeout"})
        return {
            "status": "timeout",
            "interrupt_id": interrupt_id,
            "can_proceed": False,
            "message": "Timeout — acción bloqueada por seguridad",
        }
    finally:
        _interrupts.pop(interrupt_id, None)

async def resume_interrupt(interrupt_id: str, approved: bool, notes: str = "") -> None:
    """API endpoint / webhook handler: el humano resuelve la interrupción."""
    if interrupt_id not in _interrupts:
        raise ValueError(f"Interrupción {interrupt_id} no encontrada o ya resuelta")
    _resolutions[interrupt_id] = {"approved": approved, "notes": notes}
    _interrupts[interrupt_id].set()  # desbloquear el agente

class ReviewAgent(LlmAgent):
    tools = [FunctionTool(func=flag_for_review)]
```

**Por qué funciona:** El patrón interrupt/resume crea un punto de sincronización real. `asyncio.Event.wait()` suspende la coroutine del agente en ese punto exacto — el agente no puede avanzar al siguiente paso. Cuando el humano llama a `resume_interrupt`, el `Event` se dispara y el agente retoma desde donde se interrumpió, con información de la decisión humana. El agente puede entonces decidir si proceder (`can_proceed: True`) o abortar (`can_proceed: False`).

## Ejemplo mínimo ejecutable
```python
import asyncio
from typing import Any

# Infraestructura de interrupt/resume (simplificada para demo)
_interrupts: dict[str, asyncio.Event] = {}
_resolutions: dict[str, dict] = {}
_db: list[dict] = []  # Simula persistencia

async def flag_for_review(
    action: str,
    timeout_seconds: int = 15,
) -> dict:
    """CORRECTO: interrumpe hasta resolución humana."""
    interrupt_id = f"INT-{len(_db):04d}"
    _db.append({"id": interrupt_id, "action": action, "status": "pending"})
    print(f"[AGENTE] Interrumpiendo para revisión → {interrupt_id}: {action}")

    event = asyncio.Event()
    _interrupts[interrupt_id] = event

    try:
        await asyncio.wait_for(event.wait(), timeout=timeout_seconds)
        resolution = _resolutions.get(interrupt_id, {})
        approved = resolution.get("approved", False)
        print(f"[AGENTE] Resolución recibida: {'APROBADO' if approved else 'RECHAZADO'}")
        return {
            "can_proceed": approved,
            "notes": resolution.get("notes", ""),
        }
    except asyncio.TimeoutError:
        print(f"[AGENTE] Timeout en {interrupt_id} — bloqueando por seguridad")
        return {"can_proceed": False, "notes": "timeout"}
    finally:
        _interrupts.pop(interrupt_id, None)

async def human_reviewer_responds(
    interrupt_id: str,
    approved: bool,
    delay: float = 2.0,
) -> None:
    """Simula respuesta del revisor humano (llegaría vía webhook/API)."""
    await asyncio.sleep(delay)
    print(f"[HUMANO] Resolviendo {interrupt_id}: {'APROBADO' if approved else 'RECHAZADO'}")
    _resolutions[interrupt_id] = {"approved": approved, "notes": "Revisado manualmente"}
    if interrupt_id in _interrupts:
        _interrupts[interrupt_id].set()

async def agent_workflow() -> None:
    """Simula el flujo del agente con un punto de interrupción."""
    print("[AGENTE] Iniciando proceso de alta sensibilidad...")

    result = await flag_for_review("Eliminar registros de usuario ID=42 y sus dependencias")

    if result["can_proceed"]:
        print("[AGENTE] Acción aprobada — ejecutando eliminación")
        # Solo llega aquí si el humano aprobó explícitamente
    else:
        print(f"[AGENTE] Acción bloqueada — abortando. Motivo: {result['notes']}")

async def main():
    # Lanzar el agente y simular respuesta humana concurrentemente
    agent_task = asyncio.create_task(agent_workflow())

    # Esperar a que el agente registre la interrupción
    await asyncio.sleep(0.1)
    interrupt_id = list(_interrupts.keys())[0] if _interrupts else None

    if interrupt_id:
        # Humano aprueba después de 2 segundos
        await human_reviewer_responds(interrupt_id, approved=True, delay=2.0)

    await agent_task

if __name__ == "__main__":
    asyncio.run(main())
```

## Severidad
CRÍTICO — Cap.14/15

El HITL decorativo (flag sin bloqueo) es más peligroso que no tener HITL: da la falsa sensación de que hay supervisión humana cuando el agente ya ejecutó las acciones. En auditorías de sistemas agentic, la presencia del mecanismo `flag_for_review` puede dar confianza falsa a los revisores de seguridad. La ausencia de interrupt/resume real convierte el HITL en compliance theater.
