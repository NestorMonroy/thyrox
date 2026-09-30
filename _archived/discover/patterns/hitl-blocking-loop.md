# HITL Blocking Loop — AP-16

## Anti-patrón
```python
# INCORRECTO
import asyncio
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

async def escalate_to_human(
    issue_description: str,
    severity: str,
) -> dict:
    """Escala un problema a revisión humana."""
    # Enviar notificación al sistema de tickets
    ticket_id = await send_notification_to_slack(issue_description, severity)

    # ERROR: retorna inmediatamente sin esperar respuesta humana
    return {
        "status": "success",
        "message": "Escalación enviada",
        "ticket_id": ticket_id,
    }

class EscalationAgent(LlmAgent):
    tools = [FunctionTool(func=escalate_to_human)]
```

**Por qué falla:** La función retorna `{"status": "success"}` en cuanto envía la notificación, pero no espera la respuesta del humano. El agente interpreta ese `"success"` como que la escalación fue resuelta y continúa su ejecución. El HITL es decorativo: notifica pero no bloquea, por lo que el agente puede tomar decisiones con consecuencias irreversibles antes de que el humano haya revisado nada. El "Human in the Loop" es un nombre sin implementación real.

## Patrón correcto
```python
# CORRECTO
import asyncio
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Cola global para resoluciones humanas (en producción: Redis, DB, etc.)
_pending_reviews: dict[str, asyncio.Event] = {}
_review_decisions: dict[str, dict] = {}

async def escalate_to_human(
    issue_description: str,
    severity: str,
    timeout_seconds: int = 300,
) -> dict:
    """Escala un problema a revisión humana y bloquea hasta recibir respuesta."""
    ticket_id = await send_notification_to_slack(issue_description, severity)

    # Crear evento de sincronización
    event = asyncio.Event()
    _pending_reviews[ticket_id] = event

    try:
        # BLOQUEAR hasta que el humano responda o expire el timeout
        await asyncio.wait_for(event.wait(), timeout=timeout_seconds)
        decision = _review_decisions.get(ticket_id, {})
        return {
            "status": "resolved",
            "ticket_id": ticket_id,
            "human_decision": decision.get("approved", False),
            "human_notes": decision.get("notes", ""),
        }
    except asyncio.TimeoutError:
        return {
            "status": "timeout",
            "ticket_id": ticket_id,
            "message": f"Sin respuesta humana en {timeout_seconds}s — escalando a supervisor",
        }
    finally:
        _pending_reviews.pop(ticket_id, None)

async def resolve_review(ticket_id: str, approved: bool, notes: str = "") -> None:
    """Llamado por el sistema externo cuando el humano responde."""
    if ticket_id in _pending_reviews:
        _review_decisions[ticket_id] = {"approved": approved, "notes": notes}
        _pending_reviews[ticket_id].set()  # desbloquear el agente

class EscalationAgent(LlmAgent):
    tools = [FunctionTool(func=escalate_to_human)]
```

**Por qué funciona:** `asyncio.wait_for` bloquea la coroutine del agente hasta que ocurra una de dos cosas: el humano llama a `resolve_review` (que dispara el `Event`) o expira el timeout. En ambos casos, el agente recibe información real sobre la decisión humana antes de continuar. El loop de eventos de asyncio sigue activo durante la espera, por lo que otros agentes/procesos pueden ejecutarse mientras este espera.

## Ejemplo mínimo ejecutable
```python
import asyncio
from typing import Any

# Simulación de infraestructura HITL
_pending_reviews: dict[str, asyncio.Event] = {}
_review_decisions: dict[str, dict] = {}

async def send_notification(description: str) -> str:
    """Simula envío de notificación. Retorna ticket_id."""
    ticket_id = f"TICKET-{hash(description) % 10000:04d}"
    print(f"[HITL] Notificación enviada → {ticket_id}: {description}")
    return ticket_id

async def escalate_to_human(
    issue_description: str,
    timeout_seconds: int = 10,
) -> dict:
    """CORRECTO: bloquea hasta respuesta humana."""
    ticket_id = await send_notification(issue_description)
    event = asyncio.Event()
    _pending_reviews[ticket_id] = event

    try:
        await asyncio.wait_for(event.wait(), timeout=timeout_seconds)
        decision = _review_decisions.get(ticket_id, {})
        return {
            "status": "resolved",
            "approved": decision.get("approved", False),
            "notes": decision.get("notes", ""),
        }
    except asyncio.TimeoutError:
        return {"status": "timeout", "ticket_id": ticket_id}
    finally:
        _pending_reviews.pop(ticket_id, None)

async def human_approves(ticket_id: str, notes: str = "") -> None:
    """Simula respuesta del humano."""
    await asyncio.sleep(2)  # El humano tarda 2 segundos en revisar
    print(f"[HUMANO] Aprobando {ticket_id}")
    _review_decisions[ticket_id] = {"approved": True, "notes": notes}
    if ticket_id in _pending_reviews:
        _pending_reviews[ticket_id].set()

async def main():
    # Simular: agente escala y humano aprueba concurrentemente
    escalation_task = asyncio.create_task(
        escalate_to_human("Transacción sospechosa: $50,000 a cuenta nueva")
    )

    # El humano responde al ticket (simulado)
    # En producción, esto vendría de un webhook o API externa
    await asyncio.sleep(0.1)  # Dar tiempo al escalate_to_human para registrarse
    ticket_id = list(_pending_reviews.keys())[0] if _pending_reviews else None
    if ticket_id:
        await human_approves(ticket_id, notes="Verificado con el cliente, proceder")

    result = await escalation_task
    print(f"[AGENTE] Resultado HITL: {result}")
    # Output esperado: {"status": "resolved", "approved": True, "notes": "..."}

if __name__ == "__main__":
    asyncio.run(main())
```

## Severidad
CRÍTICO — Cap.14/15 del libro analizado

En sistemas con consecuencias irreversibles (transacciones financieras, acciones de infraestructura, comunicaciones externas), la ausencia del bloqueo real convierte el HITL en un log decorativo. El agente actúa como si tuviera aprobación cuando en realidad no la tiene.
