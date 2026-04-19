```yml
created_at: 2026-04-19 10:51:48
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Patrones de Brecha de Implementación para el Sistema Agentic AI

Este documento formaliza los patrones de error observados en el análisis adversarial de
Cap.11-14 del libro de patrones de Agentic AI. Complementa `agentic-claims-management-patterns.md`
(que cubre gestión de claims y calibración epistémica). Este documento cubre específicamente
los errores de implementación en código — cómo evitarlos al generar código en el Sistema
Agentic AI y cómo detectarlos cuando un agente los produce.

---

## 1. El Patrón Más Sistemático: Mecanismo Nombrado vs. Implementación Real

### Observación empírica

En 5 capítulos consecutivos del libro analizado, el mecanismo que da nombre al capítulo
es el menos implementado en el código de demostración:

| Capítulo | Mecanismo prometido | Lo que el código hace en realidad |
|----------|--------------------|------------------------------------|
| Cap.10 | "Dynamic Discovery" | Servidores MCP hardcodeados en lista estática |
| Cap.11 | "Goal Monitoring" | Termina silenciosamente — mismo output si goals met o si loop se agota |
| Cap.12 | "Exception Handling" | Fallback inoperable — `state["primary_location_failed"]` nunca establecida |
| Cap.13 | "Human in the Loop" | No hay loop — `escalate_to_human()` retorna éxito inmediatamente sin bloqueo |
| Cap.14 | "Knowledge Retrieval" | Recupera HTML de GitHub, no el documento de conocimiento |

No es un error puntual — es un patrón editorial sistemático donde la descripción teórica
del patrón y su demostración en código están desacopladas.

### Mecanismo del anti-patrón

El patrón ocurre porque:
1. La descripción textual captura bien el *concepto* del mecanismo
2. El código de ejemplo tiene la *forma* correcta (nombres de funciones, estructura)
3. Pero el *comportamiento* del código no implementa el mecanismo central

La arquitectura parece correcta. Los nombres son apropiados. El código compila.
Solo cuando se ejecuta o se analiza en detalle emerge que el mecanismo no opera.

### Regla para el Sistema Agentic AI

```
REGLA ANTI-BRECHA:
Cuando un agente genera código que "implementa" un patrón nombrado,
el agente adversarial DEBE verificar:

1. ¿El mecanismo central del patrón está en el código de ejecución?
   No en la descripción, no en los nombres — en el flujo de ejecución.

2. ¿Existe un test de "happy path" Y un test de "fallo"?
   Si el sistema de fallback/recovery/monitoring produce el MISMO
   output en éxito y en fallo → el mecanismo no está implementado.

3. ¿El ejemplo puede ejecutarse con un input que triggere el mecanismo?
   "Knowledge Retrieval" con una URL que devuelve HTML pasa sin error
   pero no demuestra el mecanismo. El test correcto requiere un
   documento real y una query que verifique que se recuperó el contenido.
```

### Señales de alerta (red flags en código generado)

- Función nombrada `handle_error()` que siempre retorna `{"status": "success"}`
- Loop de monitoreo que produce el mismo output si el objetivo se alcanzó o no
- Fallback que verifica una variable de estado que ningún código establece
- RAG que "recupera" de una URL sin verificar que el contenido recibido es el esperado
- HITL donde la función de escalación humana retorna sin esperar respuesta

---

## 2. Patrón: Comentario Incorrecto como Evidencia de Malentendido del Contrato

### Observación empírica

En Cap.13 (tablas, `technical_support_agent`):

```python
def personalization_callback(...) -> Optional[LlmRequest]:
    # ...
    llm_request.contents.insert(0, system_content)
    return None  # Return None to continue with the modified request
```

El comentario `# Return None to continue with the modified request` documenta
explícitamente la creencia del autor de que `return None` propaga la modificación in-place.
El contrato del framework (ADK `before_model_callback`) es el opuesto:
- `return None` → usar el request **original**
- `return llm_request` → usar el request (potencialmente modificado)

El autor debería haber escrito `return llm_request`. El comentario revela que el error
no es accidental — es la implementación consciente de una creencia incorrecta sobre el
contrato del framework.

### Por qué es más grave que un bug ordinario

Un bug sin comentario puede ser un typo o descuido. Un bug con un comentario que documenta
el comportamiento incorrecto como si fuera correcto está **enseñando activamente el patrón
erróneo** al lector. Cada desarrollador que lea ese código aprenderá que `return None`
propaga modificaciones in-place en ADK — lo opuesto de lo que el framework garantiza.

El mismo error aparece en el `loan_approval_agent` del mismo capítulo (sin el comentario
revelador), confirmando que es sistemático en el capítulo, no un typo aislado.

### Regla para el Sistema Agentic AI

```
REGLA DEL CONTRATO DE FRAMEWORK:
Cuando un agente genera código que usa callbacks de frameworks externos,
SIEMPRE verificar el contrato de retorno documentado:

Para ADK before_model_callback:
  return None         → el framework usa el request ORIGINAL
  return llm_request  → el framework usa ESTE request (con modificaciones)
  return LlmResponse  → bypass del modelo, usa esta response directamente

Para LangChain callbacks: revisar la firma específica del método.
Para cualquier callback/hook: verificar en la documentación oficial
qué significa cada valor de retorno ANTES de escribir el código.

NUNCA asumir que modificar un objeto in-place y retornar None propaga
la modificación — solo es válido si el framework garantiza explícitamente
que pasa la referencia sin copia.
```

### Protocolo de verificación de contrato

```python
# PATRÓN INCORRECTO (asume que in-place + None propaga cambios):
def my_callback(context, request) -> Optional[Request]:
    request.contents.insert(0, new_content)
    return None  # INCORRECTO si el framework requiere retornar el objeto

# PATRÓN CORRECTO (retorna el objeto modificado explícitamente):
def my_callback(context, request) -> Optional[Request]:
    request.contents.insert(0, new_content)
    return request  # Garantiza que el framework usa el request modificado

# ALTERNATIVA SEGURA (copia explícita + retorno):
def my_callback(context, request) -> Optional[Request]:
    modified = copy.deepcopy(request)
    modified.contents.insert(0, new_content)
    return modified  # Sin side effects en el objeto original
```

---

## 3. Patrón: Fallo Silencioso que Parece Éxito

### Observación empírica

Tres casos distintos del mismo anti-patrón observados en la serie:

**Caso A — Cap.11, silent loop termination:**
```python
for i in range(max_iterations):
    code = generate_code(...)
    if goals_met(feedback, goals):
        break
    previous_code = code

final_code = add_comment_header(code, use_case)
return save_code_to_file(final_code, use_case)
```
Si el loop se agota sin que `goals_met()` retorne True, el código retorna el archivo
igualmente. El caller no puede distinguir entre "objetivos alcanzados" y "objetivos
no alcanzados después de N iteraciones".

**Caso B — Cap.12, fallback silencioso:**
```python
# fallback_handler verifica state["primary_location_failed"]
# pero nadie establece ese valor
# → fallback_handler siempre ejecuta el branch "do nothing"
# → response_agent siempre se disculpa
# El sistema se comporta igual si primary_handler tuvo éxito o falló
```

**Caso C — Cap.14, HTML silencioso:**
```python
url = "https://github.com/.../.../blob/master/doc.txt"
res = requests.get(url)  # retorna HTML de GitHub, no el texto
with open("doc.txt", "w") as f:
    f.write(res.text)    # escribe HTML
# No hay validación de content-type ni de que el texto es lo esperado
# El pipeline completo ejecuta sin errores sobre ruido HTML
```

### Patrón común

En los tres casos:
1. No hay excepción
2. No hay mensaje de error
3. El código produce un output que parece válido
4. El output es incorrecto o inútil

El fallo silencioso es más peligroso que el fallo explícito porque el sistema
reporta éxito mientras opera incorrectamente.

### Regla para el Sistema Agentic AI

```
REGLA ANTI-FALLO-SILENCIOSO:

1. DISTINGUIR éxito de agotamiento en loops iterativos:
   - Agregar variable de control: goals_achieved = False
   - Establecer goals_achieved = True dentro del break
   - Verificar después del loop: if not goals_achieved: raise o log warning
   - El caller DEBE poder distinguir entre ambos estados

2. VALIDAR el resultado de operaciones de recuperación:
   - Después de requests.get: verificar Content-Type header
   - Después de file download: verificar que el contenido tiene la forma esperada
   - Después de query a DB/API: verificar que el resultado no es vacío o error

3. DISEÑAR fallbacks con señalización explícita:
   - Si un handler falla, DEBE establecer un flag de fallo verificable
   - El fallback DEBE poder leer ese flag
   - Si el flag no existe, el fallback DEBE asumir estado de error, no éxito

EJEMPLO CORRECTO para loop iterativo:
```python
goals_achieved = False
for i in range(max_iterations):
    code = generate_code(...)
    if goals_met(feedback, goals):
        goals_achieved = True
        break

if not goals_achieved:
    logger.warning(f"Goals not met after {max_iterations} iterations")
    # Caller puede decidir: reintentar, notificar usuario, o aceptar resultado

return save_code_to_file(code, use_case, goals_achieved=goals_achieved)
```

---

## 4. Patrón: CCV — Cita Verificable en el Cuerpo (o su Ausencia)

### Observación empírica

Patrón CCV verificado en 5 análisis de calibración:

| Capítulo | Referencias | Citas inline | Ratio |
|----------|-------------|--------------|-------|
| Cap.9 | arXiv inline en body | SÍ | 77% (CALIBRADO) |
| Cap.12 | 3 referencias reales | NO | 53.1% (PARCIALMENTE) |
| Cap.13 | 1 referencia real | NO | 50.6% (PARCIALMENTE) |
| Cap.14 | 5 referencias (2 arXiv) | NO | 62.1% (PARCIALMENTE) |
| Cap.11 tablas | código ejecutable | N/A | 71.9% (PARCIALMENTE) |

**Conclusión empírica confirmada en 3 análisis consecutivos:**
Referencias al final del documento sin citas inline en el cuerpo NO elevan la calibración
de los claims individuales. Lo que eleva la calibración es la cita inline que ancla
el claim específico a la fuente que lo respalda.

### Mecanismo

El lector (y el agente calibrador) evalúa cada claim según la evidencia disponible
*en el contexto del claim*. Una referencia al final del documento no está en el contexto
de ningún claim específico — el lector no sabe qué claim respalda ni con qué exactitud.

Ejemplo de la diferencia:

```
# Sin CCV (calibración baja):
"This approach reduces hallucinations by grounding responses in verifiable data."
... [sección References]
1. Lewis et al. (2020) arXiv:2005.11401

# Con CCV (calibración alta — patrón de Cap.9):
"Lewis et al. (2020) [arXiv:2005.11401] demonstrated that RAG reduces factual
errors by 12-35% compared to standard generation across knowledge-intensive tasks."
```

### Regla para el Sistema Agentic AI

```
REGLA CCV:
Al generar documentación técnica con claims cuantitativos o cualitativos
que requieren respaldo:

1. CADA claim que afirme una propiedad de un sistema o técnica DEBE tener
   una cita inline que lo ancle: "(Lewis et al., 2020)", "[arXiv:XXXX]"

2. Las secciones "References" al final son necesarias pero NO suficientes.
   La presencia de buenas referencias sin citas inline = calibración similar
   a un documento sin referencias.

3. Prioridad de evidencia para calibración:
   - Observación directa en código ejecutable: 1.0
   - Cita inline con paper verificable: 0.85-1.0
   - Inferencia con hedging apropiado: 0.65-0.80
   - Referencia al final sin inline: no eleva el claim base
   - Claim sin respaldo: 0.10-0.40

4. Si no hay cita para un claim numérico específico, usar hedging:
   "In practice, chunking strategies typically..." en lugar de
   "Chunking reduces retrieval time by 60-70%"
```

---

## 5. Patrón: Código de Tablas vs. Código del Texto Principal

### Observación empírica

En Cap.11 y Cap.13, el contenido de las tablas HTML de la extracción EPUB contenía
código diferente al texto principal:

| Capítulo | Texto principal | Tablas HTML |
|----------|----------------|-------------|
| Cap.11 | Snippet parcial de `run_code_agent` | Código completo (Iteration 2) + Expert Code Reviewer (Tabla 3) |
| Cap.12 | Código completo del SequentialAgent | Mismo código (no había diferencia) |
| Cap.13 | `loan_approval_agent` (LiteLlm + OpenAI) | `technical_support_agent` (Gemini) |

En Cap.13, los dos ejemplos tienen implementaciones del mismo patrón con las mismas
confusiones (return None, role="system"), lo que confirma que los bugs son sistémicos
en el capítulo — no errores aislados en un ejemplo.

### Implicación para el Sistema

```
REGLA DE EXHAUSTIVIDAD DE INPUTS:
Cuando se prepara el input.md de un capítulo para análisis:

1. VERIFICAR que el contenido de tablas HTML está incluido.
   Los sistemas de extracción EPUB pueden omitir tablas — el contenido
   de tablas es frecuentemente diferente al texto fluido.

2. Si hay múltiples ejemplos del mismo patrón, ANALIZARLOS TODOS.
   Si todos tienen el mismo bug → el bug es sistemático (enseñanza intencional).
   Si solo uno tiene el bug → puede ser un error puntual.

3. Tratar la consistencia de bugs entre ejemplos como evidencia de intención:
   - Bug en 1/2 ejemplos: posible descuido
   - Bug en 2/2 ejemplos con mismo comentario: patrón educativo incorrecto
   El capítulo está enseñando activamente el patrón incorrecto.
```

---

## 6. Anti-Patrones de Código Documentados (tabla de referencia rápida)

| Anti-patrón | Código | Consecuencia | Corrección |
|-------------|--------|--------------|------------|
| **Return None en callback de modificación** | `modify_obj(); return None` | Modificación ignorada si framework hace deepcopy | `return obj` después de modificar |
| **role="system" en contents de Gemini** | `Content(role="system", ...)` en `llm_request.contents` | Content ignorado o error de validación | Usar `system_instruction` en configuración del modelo |
| **URL de vista HTML en lugar de raw** | `github.com/user/repo/blob/...` | `requests.get` descarga HTML, no el archivo | Usar `raw.githubusercontent.com/...` |
| **Dead imports** | `from x import Y` sin usar Y | Confusión, versiones no especificadas | Eliminar imports no usados; especificar versiones |
| **State verificado sin establecer** | `if state["flag"]` donde nadie escribe `flag` | Fallback nunca se activa, silenciosamente | Documentar quién establece el flag; agregar guard de inicialización |
| **Stubs hardcodeados como implementación** | `return {"ticket_id": "TICKET123"}` | Todos los tickets tienen el mismo ID | Señalizar explícitamente como placeholder; nunca presentar como código de producción |
| **LLM para generar nombres de archivo** | `llm.invoke(f"summarize to 10 chars: {use_case}")` | Latencia extra, posible vacío o charset inválido | `uuid` o hash determinístico |
| **Loop sin señal de éxito** | `for i in range(N): if done: break; return result` | Caller no puede distinguir éxito de agotamiento | `success_flag = False; if done: success_flag = True; break` |
| **escalate/flag retorna success inmediato** | `def escalate(): return {"status":"success"}` | No hay bloqueo real; el LLM continúa sin esperar humano | Interrupt pattern real: pausar workflow, esperar aprobación externa |
| **Deprecación silenciosa de imports** | `from langchain_community.embeddings import X` | Warning o ImportError en versiones recientes | Usar imports actualizados; especificar versión de dependencia |

---

## 7. Protocolo de Verificación de Código para el Sistema Agentic AI

Cuando un agente del sistema genera código que implementa un patrón nombrado,
el agente adversarial aplica este protocolo antes de aprobar:

```
PASO 1 — VERIFICAR MECANISMO CENTRAL
  Pregunta: "Si ejecuto este código con un input que activa el mecanismo nombrado,
  ¿el mecanismo realmente ocurre?"
  
  Para Monitoring: ¿el sistema distingue entre objetivo alcanzado y no alcanzado?
  Para Exception Handling: ¿hay un try/except o mecanismo de detección real?
  Para HITL: ¿hay un bloqueo hasta que el humano responda?
  Para RAG: ¿el retrieval recupera el documento correcto?

PASO 2 — VERIFICAR CONTRATOS DE FRAMEWORK
  Para cada callback/hook:
    - ¿Qué significa return None en este framework?
    - ¿Qué significa return objeto en este framework?
    - ¿El código retorna el tipo correcto para el comportamiento deseado?
  
  Para cada inserción de Content/Message:
    - ¿El rol que se usa es válido en este framework?
    - ¿Dónde se configura "system" en este framework?

PASO 3 — VERIFICAR FUENTES EXTERNAS
  Para cada URL de datos:
    - ¿La URL devuelve el tipo de contenido esperado?
    - ¿Hay validación del Content-Type o de la estructura del resultado?
  
  Para cada llamada a API:
    - ¿El resultado puede ser vacío, error, o formato inesperado?
    - ¿El código maneja esos casos?

PASO 4 — VERIFICAR SEÑALIZACIÓN DE ESTADO
  - ¿Cada estado que se lee también se escribe en el mismo snippet o está documentado?
  - ¿Los loops iterativos señalizan la diferencia entre éxito y agotamiento?
  - ¿Los fallbacks dependen de estados que se garantizan establecer?

PASO 5 — VERIFICAR LIMPIEZA
  - ¿Hay imports no usados?
  - ¿Hay variables definidas pero nunca llamadas?
  - ¿Los stubs están marcados explícitamente como placeholders?
```

---

## 8. Relación con `agentic-claims-management-patterns.md`

Este documento es complementario, no sustituto. La distinción:

| `agentic-claims-management-patterns.md` | Este documento |
|------------------------------------------|----------------|
| Calibración epistémica de **texto descriptivo** | Correctitud de **código generado** |
| Claims cuantitativos sin fuente | Contratos de framework ignorados |
| Denominador sin control | Fallos silenciosos |
| Cherry-pick de claims buenos | Verificación de mecanismo central |
| CCV — citas inline en body | CCV aplicado a código: funciones no definidas, imports incorrectos |

Ambos documentos responden a la misma pregunta desde ángulos distintos:
**¿Cómo sabemos que lo que el sistema produce es correcto?**

- `agentic-claims-management-patterns.md` responde para afirmaciones en lenguaje natural
- Este documento responde para código ejecutable

El sistema adversarial del Agentic AI debe aplicar ambos lentes simultáneamente:
un artefacto puede tener calibración textual alta (bien redactado, bien referenciado)
y código técnicamente incorrecto — como Cap.14 (conceptos técnicos 87.5%, URL del código 0%).
