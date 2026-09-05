```yml
created_at: 2026-04-19 10:57:07
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Patrón: Comentario Incorrecto como Evidencia de Malentendido del Contrato

Derivado del análisis adversarial de Cap.13 HITL (tablas, `technical_support_agent`).

---

## Observación

En el `technical_support_agent` del capítulo, el callback de personalización modifica
el request del LLM in-place y luego retorna `None`:

```python
def personalization_callback(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmRequest]:
    """Adds personalization information to the LLM request."""
    if customer_info:
        # ...
        llm_request.contents.insert(0, system_content)
    return None  # Return None to continue with the modified request
```

El comentario `# Return None to continue with the modified request` documenta
explícitamente la creencia del autor de que `return None` propaga la modificación
in-place. El contrato real de ADK `before_model_callback` es:

- `return None` → el framework continúa con el **request original** (no el modificado)
- `return llm_request` → el framework usa **este objeto** (con la modificación)
- `return LlmResponse` → bypass del modelo, usa ese response directamente

El autor debería haber escrito `return llm_request`. La función declara
`-> Optional[LlmRequest]` correctamente — pero siempre retorna `None`.

El mismo bug aparece en el `loan_approval_agent` del mismo capítulo (sin comentario).
La presencia del comentario en el segundo ejemplo confirma que no es un typo: es la
implementación consciente de una creencia incorrecta sobre el contrato del framework.

---

## Por qué es más grave que un bug ordinario

Un bug sin comentario puede ser descuido. Un bug acompañado de un comentario que
describe el comportamiento incorrecto como si fuera correcto **enseña activamente el
patrón erróneo** al lector. Cada desarrollador que copie ese código aprenderá que
`return None` propaga modificaciones in-place en ADK — lo opuesto de lo que el
framework garantiza.

---

## Regla para el Sistema Agentic AI

Cuando el sistema genera código con callbacks de frameworks externos, verificar el
contrato de retorno antes de escribir:

```python
# INCORRECTO — asume que in-place + None propaga cambios:
def my_callback(context, request) -> Optional[Request]:
    request.contents.insert(0, new_content)
    return None

# CORRECTO — retorna el objeto modificado explícitamente:
def my_callback(context, request) -> Optional[Request]:
    request.contents.insert(0, new_content)
    return request
```

Si el contrato del framework no está claro, retornar el objeto modificado
siempre es más seguro que retornar `None` después de una modificación in-place.
