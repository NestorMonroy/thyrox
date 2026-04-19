```yml
created_at: 2026-04-19 10:36:25
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Chapter 13: Human in the Loop" (documento externo, 2026-04-19)
nota: |
  Primera versión analizada. Sin versiones corregidas previas.
  1 referencia real (arXiv:2108.00941) — solo en References, no citada inline.
  Código usa Google ADK (before_model_callback, after_model_callback, LlmAgent).
  A diferencia de Cap.12: las herramientas (get_loan_status, update_loan_status,
  approve_loan, reject_loan, flag_for_review) están definidas inline en el snippet.
  Bug crítico identificado: personalization_callback modifica llm_request.contents
  in-place pero retorna None — en ADK, before_model_callback que retorna None
  indica "usar request original", lo que puede ignorar la modificación in-place.
  Nuevo concepto introducido: "Human-on-the-loop" vs "Human-in-the-loop".
  Finance (loan officer) y legal (judge) ejemplos con oversight humano explícito.
```

# Input: Chapter 13 — Human in the Loop (texto completo, preservado verbatim)

---

## INTRODUCCIÓN

As AI agents become more capable and are increasingly integrated into high-stakes decision-making processes, the question of how to maintain meaningful human oversight and control becomes critical.

Fully autonomous AI agents, while powerful, can make mistakes, exhibit unexpected behaviors, or encounter situations beyond their designed parameters.

Human-in-the-Loop (HITL) represents a fundamental design philosophy for building trustworthy AI systems by strategically preserving human agency within automated workflows.

This pattern directly addresses the challenge of deploying AI agents in sensitive domains where errors have significant consequences.

The Human-in-the-Loop pattern provides a structured approach to determining when and how to involve human judgment, ensuring agents remain assistants rather than autonomous decision-makers in critical scenarios.

The key challenge this pattern addresses is that of automation bias — the tendency for humans or other AI systems to over-trust automated decisions — which can lead to critical errors being overlooked.

Beyond error prevention, HITL also enables continuous improvement by incorporating human feedback into the decision-making process, creating a learning loop that allows the AI to refine its behavior over time.

Finally, HITL creates clear lines of accountability and allows for easy auditing of decisions, as there's always a human who can explain and justify the final outcomes.

---

## Human-in-the-Loop Pattern Overview

The Human-in-the-Loop pattern describes a collaborative architecture where AI agents handle routine tasks while seamlessly transferring control to human operators for cases that exceed their confidence thresholds, require ethical judgment, or present novel situations.

This pattern involves three key components:

**AI Agent Tasks:** The AI handles routine, high-volume, or data-intensive tasks that benefit from automation.

**Handoff Criteria:** Clear conditions are defined for when the AI should yield to a human, such as low confidence scores, sensitive data, edge cases, or explicit user requests.

**Human Review Interface:** A mechanism exists for humans to review, approve, modify, or reject the AI's proposed actions before execution.

The pattern typically operates in a feedback loop: AI processes input, applies handoff criteria, routes to human if needed, human provides input or approval, and the loop continues.

This pattern can be implemented in various ways depending on the required level of human involvement:

**Human-in-the-Loop (HITL):** Humans are directly involved in the decision-making process, often approving or rejecting AI suggestions.

**Human-on-the-Loop (HOTL):** Humans monitor the AI's actions and can intervene if necessary, but don't need to approve every decision.

**Human-in-Command (HIC):** Humans retain ultimate authority and can override any AI decision.

**[image: Fig.1 — Human-in-the-Loop, Human-on-the-Loop, and Human-in-Command patterns]**

---

## Practical Applications & Use Cases

The HITL pattern is essential in scenarios where mistakes are costly, irreversible, or have significant ethical implications.

- **Medical Diagnosis:** An AI agent assists in analyzing medical images, but a radiologist reviews and approves all diagnoses before they're communicated to patients. The AI handles the data-intensive image analysis; the human provides the final medical judgment.

- **Financial Services (Loan Approval):** An AI agent assesses loan applications based on financial data and credit history, but a loan officer reviews and approves any application that falls below a certain confidence threshold or involves significant sums. This ensures complex edge cases and fairness concerns are handled by a human.

- **Content Moderation:** An AI agent flags potentially harmful content, but human moderators review all flagged content before any account suspensions or content removals are carried out. This prevents automated over-removal and ensures nuanced judgment.

- **Legal and Compliance:** An AI agent drafts legal documents or analyzes contracts, but a human lawyer or compliance officer reviews and signs off on all final documents. This ensures legal validity and ethical compliance.

- **Criminal Justice:** An AI agent analyzes evidence and suggests sentencing guidelines, but a human judge makes all final decisions. This ensures that factors beyond the AI's knowledge base, as well as human compassion and ethical judgment, inform the final outcome.

- **Autonomous Vehicles:** An autonomous vehicle agent handles routine driving, but a remote human operator can monitor the situation and take control in complex or ambiguous scenarios. This is a form of "Human-on-the-Loop" where humans aren't in every decision, but can intervene.

- **Automated Trading:** A trading agent operates based on predefined rules and policies set by human portfolio managers. The humans set the strategy, and the AI executes within those boundaries. This is another form of HOTL where the human is "in command" of the overall strategy.

---

## Hands-On Code Example (ADK)

In this example, we'll implement a Human-in-the-Loop system for a loan approval process. The system will use Google ADK's callback mechanisms to flag loan applications that require human review based on certain criteria.

```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.lite_llm import LiteLlm
from google.adk import types

def get_loan_status(loan_id: str) -> dict:
    """Get current loan application status"""
    return {
        "loan_id": loan_id,
        "amount": 500000,
        "credit_score": 720,
        "employment_status": "employed",
        "annual_income": 120000,
        "debt_to_income": 0.35,
        "purpose": "home_purchase"
    }

def update_loan_status(loan_id: str, status: str, reason: str) -> dict:
    """Update loan application status"""
    return {"success": True, "loan_id": loan_id, "new_status": status}

def approve_loan(loan_id: str) -> dict:
    """Approve a loan application"""
    return {"success": True, "loan_id": loan_id, "status": "approved"}

def reject_loan(loan_id: str, reason: str) -> dict:
    """Reject a loan application"""
    return {"success": True, "loan_id": loan_id, "status": "rejected", "reason": reason}

def flag_for_review(loan_id: str, reason: str) -> dict:
    """Flag a loan application for human review"""
    return {"success": True, "loan_id": loan_id, "status": "pending_human_review", "reason": reason}

def personalization_callback(
    callback_context: CallbackContext,
    llm_request
) -> None:
    """Add human oversight instructions based on loan risk profile"""
    risk_context = """
    IMPORTANT HUMAN OVERSIGHT RULES:
    - For loan amounts > $1M: ALWAYS flag for human review
    - For credit scores < 650: ALWAYS flag for human review
    - For debt-to-income ratio > 0.43: ALWAYS flag for human review
    - For business loans > $500K: Recommend human review
    - Always explain your reasoning clearly
    - If uncertain about any factor, flag for human review
    """
    
    # Modify the request to include our risk guidelines
    llm_request.contents.insert(0, types.Content(
        role="system",
        parts=[types.Part.from_text(risk_context)]
    ))

def after_model_callback(
    callback_context: CallbackContext,
    llm_response
) -> None:
    """Log all loan decisions for audit trail"""
    # In production, this would log to an audit system
    print(f"Decision logged for audit: {llm_response}")

loan_agent = LlmAgent(
    name="loan_approval_agent",
    model=LiteLlm(model="openai/gpt-4o"),
    instruction="""You are a loan approval assistant. Your role is to:
1. Analyze loan applications objectively
2. Make recommendations based on financial data
3. Flag applications for human review when they meet certain criteria
4. Provide clear explanations for all decisions

Always prioritize fairness and compliance with lending regulations.""",
    tools=[get_loan_status, update_loan_status, approve_loan, reject_loan, flag_for_review],
    before_model_callback=personalization_callback,
    after_model_callback=after_model_callback
)
```

The code demonstrates implementing a Human-in-the-Loop pattern for a loan approval process using Google ADK's callback mechanisms.

The system defines five business logic functions: `get_loan_status` retrieves the current status of a loan application, `update_loan_status` modifies the application's status, `approve_loan` marks an application as approved, `reject_loan` marks an application as rejected with a reason, and `flag_for_review` escalates an application to human review.

Two callbacks control the agent's behavior. The `personalization_callback` runs before the model processes each request. It inserts a system prompt containing oversight rules, such as flagging loans above $1 million or with poor credit scores, directly into the conversation. The `after_model_callback` runs after the model's response. It logs every decision for auditing purposes.

The loan_agent is configured with these callbacks and provided access to the loan management tools. This architecture ensures consistent policy enforcement and a complete audit trail for every decision made.

---

## At a Glance

**What:**
As AI agents are deployed in critical domains — healthcare, finance, law, and safety — the risk of unreviewed or incorrect automated decisions increases significantly. Fully autonomous agents may act on flawed data, misinterpret complex situations, or lack the contextual understanding required for nuanced ethical judgment. Without a structured process for human oversight, AI agents can cause irreversible harm, erode user trust, and create legal and regulatory liabilities.

**Why:**
The Human-in-the-Loop pattern provides a principled framework for deploying AI responsibly by defining clear boundaries for AI autonomy. It ensures that human judgment is systematically incorporated for high-stakes decisions while still allowing AI to automate routine, low-risk tasks. By implementing HITL, organizations can leverage AI's efficiency while maintaining meaningful human control, building trust, and ensuring accountability. The pattern explicitly addresses automation bias by requiring human review for complex or uncertain cases, and supports continuous improvement by capturing human feedback for refining the AI's behavior.

**Rule of thumb:**
Use this pattern when the cost of an incorrect AI decision is high or irreversible, when decisions involve ethical considerations, when regulatory or legal oversight is required, or when building trust with users or stakeholders is essential. When in doubt, HITL errs on the side of involving humans.

**[image: Fig.2 — Human-in-the-Loop decision flow]**

---

## Key Takeaways

- HITL keeps humans in control of high-stakes AI decisions.
- It helps avoid automation bias by requiring human review for complex cases.
- Callbacks in ADK can be used to enforce oversight policies and maintain audit trails.
- HITL supports continuous improvement through human feedback loops.
- The pattern is essential in regulated industries where accountability is crucial.
- Different levels of human involvement (HITL, HOTL, HIC) can be chosen based on risk.
- HITL balances automation efficiency with human judgment and ethical oversight.

---

## Conclusion

This chapter introduces the Human-in-the-Loop pattern, a crucial design principle for deploying AI agents responsibly in high-stakes environments.

We have seen how this pattern defines the roles of AI and humans in collaborative decision-making, ensuring that AI agents act as powerful assistants rather than unchecked autonomous actors.

The chapter has covered practical applications across medicine, finance, law, and autonomous systems, all demonstrating how HITL manages risk and maintains accountability.

The ADK code example has shown how to implement HITL using callback mechanisms to enforce oversight policies, provide personalized context, and maintain a comprehensive audit trail for all decisions.

By mastering the Human-in-the-Loop pattern, developers can build AI systems that are not only highly capable but also safe, trustworthy, and aligned with human values and regulatory requirements.

---

## References

1. Mosqueira-Rey, E., Hernández-Pereira, E., Alonso-Ríos, D., Bobes-Bascarán, J., & Fernández-Leal, Á. (2023). Human-in-the-loop machine learning: A state of the art. *Artificial Intelligence Review*, 56(4), 3005–3054. https://doi.org/10.1007/s10462-022-10246-z

---

## Notas editoriales del orquestador

**Nota 1 — Bug crítico: `personalization_callback` retorna `None`:**
La función `personalization_callback` modifica `llm_request.contents` in-place (inserta un `types.Content` en posición 0) pero retorna `None`.
En Google ADK, el contrato de `before_model_callback` es:
- Si retorna `None`: usa el request original (sin modificaciones)
- Si retorna un objeto `LlmResponse`: usa ese response directamente (bypass del modelo)
- Si retorna un objeto modificado del mismo tipo: usa el request modificado
La modificación in-place del objeto mutable puede o no propagarse dependiendo de si ADK pasa el objeto por referencia o hace una copia profunda antes de invocar el callback. El capítulo no documenta este contrato. Si ADK hace deepcopy del request antes de pasarlo al callback, la modificación in-place es descartada y el `risk_context` jamás llega al modelo. El sistema HITL del ejemplo podría no tener los oversight rules activos.

**Nota 2 — `types.Content(role="system", ...)` puede no ser válido en ADK:**
ADK usa el formato de Gemini, donde los roles válidos en `contents` son típicamente "user" y "model".
El rol "system" en Gemini se especifica a través de `system_instruction` en la configuración del modelo, no como un elemento de `contents` con `role="system"`. Insertar un `Content(role="system", ...)` en `llm_request.contents` puede ser silenciosamente ignorado o causar un error de validación. Si este es el caso, el `risk_context` que define las reglas de oversight nunca es procesado por el modelo.

**Nota 3 — La referencia arXiv:2108.00941 está implícita en el DOI:**
La referencia en la sección References tiene DOI: 10.1007/s10462-022-10246-z (Artificial Intelligence Review 2023).
Esta es una publicación peer-reviewed verificable sobre HITL en ML. Sin embargo, al igual que Cap.12, la referencia NO está citada en el cuerpo del texto. Hipótesis CCV: esperamos que se confirme el patrón de Cap.12 (referencias sin citas inline no elevan calibración individual).

**Nota 4 — Las funciones de herramientas están definidas, a diferencia de Cap.12:**
A diferencia de Cap.12 donde `get_precise_location_info` y `get_general_area_info` no estaban definidas, en Cap.13 las 5 funciones (`get_loan_status`, `update_loan_status`, `approve_loan`, `reject_loan`, `flag_for_review`) están definidas en el snippet con `return` statements concretos. El código puede parcialmente ejecutarse — excepto por los bugs de Nota 1 y Nota 2 que afectan el mecanismo central de oversight.

**Nota 5 — Las funciones herramienta devuelven stubs, no lógica real:**
`get_loan_status` siempre devuelve los mismos valores hardcodeados (amount=500000, credit_score=720, etc.). `update_loan_status`, `approve_loan`, `reject_loan`, `flag_for_review` siempre devuelven `{"success": True}` independientemente del input. No hay persistencia ni lógica de negocio real. El código es un scaffold ilustrativo, no un sistema funcional. Esto es diferente a "código roto" — es código deliberadamente simplificado, pero el capítulo no lo señala explícitamente.

**Nota 6 — HITL, HOTL, HIC son conceptos bien establecidos:**
La taxonomía Human-in-the-Loop / Human-on-the-Loop / Human-in-Command es terminología estándar en literatura de autonomía de sistemas. La referencia Mosqueira-Rey et al. (2023) en Artificial Intelligence Review es relevante a esta clasificación (aunque no citada inline). Los tres conceptos son observables en la literatura — elevación de calibración si se citan correctamente.

**Nota 7 — Finance (loan) y Legal (judge) tienen disclaimer implícito apropiado:**
A diferencia de Cap.10/11/12 donde los casos de uso financieros no mencionaban MiFID II ni ACID, en Cap.13 el caso de loan approval menciona explícitamente "fairness and compliance with lending regulations" en el system prompt del agente y "legal and regulatory liabilities" en At a Glance. El tercer capítulo de casos financieros tiene más conciencia regulatoria que los tres anteriores — aunque sin citar regulaciones específicas (Equal Credit Opportunity Act, Fair Housing Act, GDPR, etc.).

**Nota 8 — `after_model_callback` con `print()` como audit trail:**
El capítulo dice "log every decision for auditing purposes" pero la implementación usa `print()`. En producción, un audit trail requiere: persistencia a storage (DB, S3, etc.), timestamp, identificador de transacción, usuario que disparó la decisión, y mecanismo de integridad (firma o hash). `print()` no es un audit trail. El código describe el concepto correctamente pero la implementación es un placeholder que el texto no señala como tal.

**Nota 9 — Automation bias citado pero sin referencia específica:**
"automation bias — the tendency for humans or other AI systems to over-trust automated decisions" aparece en la Introducción como concepto. Es un término técnico verificable (Parasuraman & Manzey, 2010; original en Mosier & Skitka, 1996). Sin embargo, el capítulo no cita ninguna referencia para este claim específico — la única referencia del capítulo es el survey general de HITL.

**Nota 10 — "Automated Trading" como HOTL tiene mayor madurez que Cap.10/11/12:**
"A trading agent operates based on predefined rules and policies set by human portfolio managers. The humans set the strategy, and the AI executes within those boundaries."
Este framing es correcto: separa estrategia humana de ejecución AI. Es más sofisticado que los tres capítulos anteriores que presentaban el trading bot como autónomo sin oversight. Aún omite MiFID II y ACID, pero el framing arquitectónico es más correcto.
