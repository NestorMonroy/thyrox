```yml
created_at: 2026-04-19 10:48:26
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Chapter 13: Human in the Loop — Tablas y Bloques de Código (contenido faltante en extracción EPUB)" (documento externo, 2026-04-19)
nota: |
  Contenido COMPLEMENTARIO al ya analizado en hitl-pattern-input.md (loan agent).
  Este archivo contiene el código de las tablas HTML de CAP13_EXTRACTION.adoc.
  DIFERENCIA CRÍTICA: este es un ejemplo distinto — technical_support_agent,
  no el loan_approval_agent del EPUB principal. Son dos implementaciones
  diferentes del mismo patrón HITL en el mismo capítulo.
  Bug central revelado por el propio comentario del autor:
  "Return None to continue with the modified request" — el autor cree que
  retornar None propaga la modificación in-place. El contrato ADK es lo opuesto.
```

# Input: Chapter 13 — Human in the Loop (tablas HTML faltantes, preservado verbatim)

---

## Tabla 1 — Implementación HITL con Google ADK (technical_support_agent)

```python
from google.adk.agents import Agent
from google.adk.tools.tool_context import ToolContext
from google.adk.callbacks import CallbackContext
from google.adk.models.llm import LlmRequest
from google.genai import types
from typing import Optional

# Placeholder for tools (replace with actual implementations if needed)
def troubleshoot_issue(issue: str) -> dict:
    return {"status": "success", "report": f"Troubleshooting steps for {issue}."}

def create_ticket(issue_type: str, details: str) -> dict:
    return {"status": "success", "ticket_id": "TICKET123"}

def escalate_to_human(issue_type: str) -> dict:
    # This would typically transfer to a human queue in a real system
    return {"status": "success", "message": f"Escalated {issue_type} to a human specialist."}

technical_support_agent = Agent(
    name="technical_support_specialist",
    model="gemini-2.0-flash-exp",
    instruction="""
You are a technical support specialist for our electronics company.
FIRST, check if the user has a support history in state["customer_info"]["support_history"]. If they do, reference this history in your responses.
For technical issues:
1. Use the troubleshoot_issue tool to analyze the problem.
2. Guide the user through basic troubleshooting steps.
3. If the issue persists, use create_ticket to log the issue.
For complex issues beyond basic troubleshooting:
1. Use escalate_to_human to transfer to a human specialist.
Maintain a professional but empathetic tone. Acknowledge the frustration technical issues can cause, while providing clear steps toward resolution.
""",
    tools=[troubleshoot_issue, create_ticket, escalate_to_human]
)

def personalization_callback(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmRequest]:
    """Adds personalization information to the LLM request."""
    # Get customer info from state
    customer_info = callback_context.state.get("customer_info")
    if customer_info:
        customer_name = customer_info.get("name", "valued customer")
        customer_tier = customer_info.get("tier", "standard")
        recent_purchases = customer_info.get("recent_purchases", [])
        personalization_note = (
            f"\nIMPORTANT PERSONALIZATION:\n"
            f"Customer Name: {customer_name}\n"
            f"Customer Tier: {customer_tier}\n"
        )
        if recent_purchases:
            personalization_note += f"Recent Purchases: {', '.join(recent_purchases)}\n"
        if llm_request.contents:
            # Add as a system message before the first content
            system_content = types.Content(
                role="system", parts=[types.Part(text=personalization_note)]
            )
            llm_request.contents.insert(0, system_content)
    return None  # Return None to continue with the modified request
```

---

## Notas editoriales del orquestador

**Nota 1 — Código diferente al del EPUB principal (loan agent):**
El EPUB principal (hitl-pattern-input.md) contenía el `loan_approval_agent` con `LiteLlm(model="openai/gpt-4o")`. Este código de tablas contiene `technical_support_agent` con `model="gemini-2.0-flash-exp"`. Son dos implementaciones independientes del mismo patrón HITL en el mismo capítulo. El analysis previo (50.6% calibración, 4 bugs críticos) fue realizado sobre el loan agent. Este suplemento introduce una segunda implementación con características parcialmente distintas.

**Nota 2 — El comentario del autor revela explícitamente la confusión sobre el contrato ADK (BUG CRÍTICO):**
```python
return None  # Return None to continue with the modified request
```
El comentario `Return None to continue with the modified request` es evidencia directa de que el autor CREE que retornar `None` propaga la modificación in-place al request original. El contrato de ADK `before_model_callback` es:
- Retornar `None`: continúa con el **request original sin modificaciones** (o con la versión potencialmente modificada in-place si ADK no hace deepcopy)
- Retornar un `LlmRequest` modificado: usa ese request
- Retornar un `LlmResponse`: bypass del modelo, usa directamente ese response

El tipo de retorno `Optional[LlmRequest]` está declarado correctamente — si el autor quisiera propagar los cambios de forma explícita, debería hacer `return llm_request`. El comentario `# Return None to continue with the modified request` es incoherente con el contrato documentado. Este bug es más grave que el del loan agent porque el comentario confirma que la confusión es intencional, no accidental. El capítulo enseña al lector el patrón incorrecto explícitamente.

**Nota 3 — Segundo ejemplo con `types.Content(role="system", ...)` en contents (confirmación del bug):**
Igual que en el loan agent (hitl-pattern-input.md Nota 2):
```python
system_content = types.Content(
    role="system", parts=[types.Part(text=personalization_note)]
)
llm_request.contents.insert(0, system_content)
```
En Gemini/ADK, `contents` acepta roles "user" y "model". El rol "system" se configura via `system_instruction` en la configuración del modelo, no como elemento de `contents`. Insertar un `Content(role="system", ...)` en `contents` puede ser silenciosamente ignorado o causar error de validación. Este es el mismo bug que aparece en el loan agent — el capítulo repite el mismo error en ambos ejemplos, lo que confirma que es sistemático.

**Nota 4 — Import path diferente al del loan agent:**
Loan agent usaba: `from google.adk.agents.callback_context import CallbackContext`
Este código usa: `from google.adk.callbacks import CallbackContext`
Y: `from google.adk.models.llm import LlmRequest`

Las rutas de import pueden diferir entre versiones de ADK. `from google.adk.callbacks import CallbackContext` es potencialmente más correcto que `from google.adk.agents.callback_context import CallbackContext` si la clase fue movida entre versiones. Sin verificación de la versión exacta de ADK, ambas pueden ser correctas o incorrectas.

**Nota 5 — `ToolContext` importado pero no usado:**
```python
from google.adk.tools.tool_context import ToolContext
```
`ToolContext` está importado en la línea 2 pero no aparece en ninguna función ni tipo del código. Dead import — igual al patrón de Cap.14 con `RunnablePassthrough` y Cap.11 con `to_snake_case`.

**Nota 6 — El mismo anti-patrón HITL del loan agent: el LLM decide si escalar:**
```python
instruction="""
For complex issues beyond basic troubleshooting:
1. Use escalate_to_human to transfer to a human specialist.
"""
```
Al igual que en el loan agent, la decisión de escalar depende de que el LLM interprete "complex issues beyond basic troubleshooting" correctamente. No hay threshold determinístico, no hay interrupt pattern real, no hay bloqueo del workflow hasta que un humano responda. `escalate_to_human` retorna `{"status": "success"}` y la ejecución continúa — no hay loop que espere respuesta humana.

**Nota 7 — `escalate_to_human` tiene el mismo problema que `flag_for_review` del loan agent:**
```python
def escalate_to_human(issue_type: str) -> dict:
    # This would typically transfer to a human queue in a real system
    return {"status": "success", "message": f"Escalated {issue_type} to a human specialist."}
```
El comentario "This would typically transfer to a human queue in a real system" es el mismo anti-patrón que el `# In production, this would log to an audit system` del loan agent. El capítulo señala que el código es incompleto pero presenta la afirmación de HITL como si estuviera implementada. La función retorna inmediatamente con `success` — no hay espera, no hay transferencia real, no hay loop humano.

**Nota 8 — `TICKET123` hardcodeado en `create_ticket`:**
```python
def create_ticket(issue_type: str, details: str) -> dict:
    return {"status": "success", "ticket_id": "TICKET123"}
```
El ticket ID `TICKET123` es un string literal hardcodeado. En un sistema real, el ticket ID sería generado dinámicamente. El agente podría crear múltiples tickets en el mismo session y todos tendrían `"ticket_id": "TICKET123"`. El LLM recibiría el mismo ID para tickets distintos y no podría distinguirlos. Es más problemático que los stubs del loan agent (que al menos retornaban `success: True` de forma genérica).

**Nota 9 — Estado `state["customer_info"]` leído pero no definido en el snippet:**
```python
customer_info = callback_context.state.get("customer_info")
```
Y en la instrucción del agente:
```
FIRST, check if the user has a support history in state["customer_info"]["support_history"].
```
El estado `customer_info` es leído pero el snippet no muestra cómo se inicializa. Al igual que `state["primary_location_failed"]` en Cap.12, el mecanismo que puebla este estado es implícito. Si `customer_info` es `None` (estado no inicializado), el callback hace un early return (`if customer_info:` falla silenciosamente) y la personalización no se aplica — sin error ni advertencia.

**Nota 10 — Relación con el análisis del loan agent (hitl-pattern-input.md):**
Los bugs principales del loan agent (BUG-1: return None, BUG-2: role="system", BUG-3: no interrupt pattern, BUG-4: print() audit trail) se replican en este código de tablas:
- BUG-1 REPLICADO Y CONFIRMADO: `return None  # Return None to continue with the modified request`
- BUG-2 REPLICADO: `types.Content(role="system", ...)`
- BUG-3 REPLICADO: `escalate_to_human` retorna `success` sin bloqueo
- BUG-4 NO APLICABLE en este snippet (no hay audit trail en este ejemplo)
El capítulo usa dos ejemplos distintos para ilustrar HITL — ambos tienen los mismos bugs estructurales. La consistencia entre ejemplos confirma que los bugs son sistemáticos en el capítulo, no errores puntuales.
