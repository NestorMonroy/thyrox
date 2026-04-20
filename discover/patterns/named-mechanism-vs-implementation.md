# Named Mechanism vs Implementation — AP-25

## Anti-patrón
```python
# INCORRECTO — El nombre promete un mecanismo que el código no implementa

class AdaptiveRateLimiter:
    """Rate limiter adaptativo que ajusta límites según carga del sistema."""

    def __init__(self, base_rate: int = 100):
        self.rate = base_rate
        # No hay lógica de adaptación — la tasa nunca cambia

    def check_rate(self, request_id: str) -> bool:
        """Verifica si el request puede proceder."""
        # Implementación fija, no adaptativa
        return True  # siempre permite (sin lógica real)

    def adapt_to_load(self, current_load: float) -> None:
        """Ajusta la tasa según la carga actual."""
        pass  # TODO: implementar adaptación
        # Método existe en la interfaz pero no hace nada


class PrioritizedTaskQueue:
    """Cola con priorización inteligente basada en urgencia y contexto."""

    def __init__(self):
        self.tasks = []  # lista simple sin orden de prioridad

    def enqueue(self, task: dict) -> None:
        self.tasks.append(task)  # append simple, sin priorización

    def dequeue(self) -> dict:
        return self.tasks.pop(0)  # FIFO simple, ignora prioridades


# Cap.10: "Resource-Aware Agent" que no monitorea recursos
# Cap.11: "Self-Healing System" sin mecanismo de recuperación automática
# Cap.12: "Semantic Router" que usa if/elif sobre strings exactos
# Cap.13: "Adaptive Guardrails" con thresholds hardcoded
# Cap.14: "Intelligent Escalation" que siempre escala (sin criterio de inteligencia)
```

**Por qué falla:** El nombre del mecanismo en la clase, método o módulo establece un contrato implícito con el lector. "Adaptive" promete que el sistema cambia su comportamiento en respuesta al contexto. "Prioritized" promete que hay un orden basado en criterios. "Intelligent" promete lógica de decisión no-trivial. Cuando la implementación es un placeholder o una implementación trivial que no realiza lo prometido, se crea una brecha de confianza sistémica: el código parece más robusto de lo que es, las revisiones de seguridad y arquitectura fallan al evaluar capacidades reales, y otros módulos que dependen del mecanismo nombrado se construyen sobre premisas falsas.

## Patrón correcto
```python
# CORRECTO — opción A: implementar el mecanismo nombrado

class AdaptiveRateLimiter:
    """Rate limiter que ajusta límites según carga observada del sistema."""

    def __init__(self, base_rate: int = 100, min_rate: int = 10, max_rate: int = 500):
        self.base_rate = base_rate
        self.current_rate = base_rate
        self.min_rate = min_rate
        self.max_rate = max_rate
        self._load_history: list[float] = []

    def adapt_to_load(self, current_load: float) -> None:
        """Ajusta la tasa basándose en carga reciente (EWMA)."""
        self._load_history.append(current_load)
        if len(self._load_history) > 10:
            self._load_history.pop(0)

        avg_load = sum(self._load_history) / len(self._load_history)

        if avg_load > 0.8:  # Alta carga: reducir tasa
            self.current_rate = max(self.min_rate, int(self.current_rate * 0.8))
        elif avg_load < 0.3:  # Baja carga: aumentar tasa
            self.current_rate = min(self.max_rate, int(self.current_rate * 1.2))
        # Entre 0.3 y 0.8: mantener tasa actual


# CORRECTO — opción B: si no se puede implementar, no nombrar el mecanismo

class RateLimiter:
    """Rate limiter con tasa fija. No implementa adaptación dinámica."""

    def __init__(self, rate: int = 100):
        self.rate = rate

    def check_rate(self, request_id: str) -> bool:
        # Implementación real del check con tasa fija
        return True


# CORRECTO — opción C: marcar explícitamente como placeholder con TODO concreto

class AdaptiveRateLimiter:
    """
    Rate limiter adaptativo.
    PLACEHOLDER: actualmente usa tasa fija.
    TODO(sprint-42): implementar adaptación basada en métricas de Prometheus.
    Ver: https://jira.internal/INFRA-1234
    """

    def adapt_to_load(self, current_load: float) -> None:
        # PLACEHOLDER — no implementado (ver docstring de clase)
        raise NotImplementedError(
            "AdaptiveRateLimiter.adapt_to_load no implementado. "
            "Ver TODO en docstring de la clase."
        )
```

**Por qué funciona:** Las tres opciones eliminan la brecha entre nombre e implementación. Opción A implementa el mecanismo real. Opción B usa un nombre que describe lo que el código realmente hace. Opción C mantiene el nombre de la intención pero hace explícito el estado placeholder, y el `NotImplementedError` previene que código que depende del mecanismo falle silenciosamente.

## Ejemplo mínimo ejecutable
```python
"""
Demostración del patrón: Named Mechanism vs Implementation.
Compara comportamiento de placeholder silencioso vs explícito.
"""
from typing import Optional


# ANTI-PATRÓN: placeholder silencioso
class SilentPlaceholder:
    """Semantic Router que enruta según intención detectada."""

    def route(self, message: str) -> str:
        """Enruta el mensaje al agente correcto según semántica."""
        # No hay semántica — es un if/elif sobre strings exactos
        if "precio" in message:
            return "pricing_agent"
        elif "soporte" in message:
            return "support_agent"
        return "default_agent"


# CORRECTO opción B: nombre honesto
class KeywordRouter:
    """Enruta mensajes basándose en presencia de palabras clave."""

    def __init__(self, routes: dict[str, str]):
        self.routes = routes  # {keyword: agent_name}

    def route(self, message: str) -> str:
        for keyword, agent in self.routes.items():
            if keyword in message.lower():
                return agent
        return "default_agent"


# CORRECTO opción C: placeholder explícito
class SemanticRouter:
    """
    Semantic Router basado en embeddings.
    PLACEHOLDER: actualmente usa KeywordRouter internamente.
    TODO: reemplazar con modelo de embeddings cuando esté disponible el endpoint.
    """

    def __init__(self):
        self._impl = KeywordRouter({"precio": "pricing_agent", "soporte": "support_agent"})
        print("[WARNING] SemanticRouter usa implementación de keyword como placeholder")

    def route(self, message: str) -> str:
        return self._impl.route(message)


# Comparación de comportamiento
router_a = SilentPlaceholder()
router_b = KeywordRouter({"precio": "pricing_agent", "soporte": "support_agent"})
router_c = SemanticRouter()

test_message = "¿Cuál es el precio del plan premium?"

print(f"SilentPlaceholder: {router_a.route(test_message)}")  # funciona pero miente
print(f"KeywordRouter:     {router_b.route(test_message)}")  # nombre honesto
print(f"SemanticRouter:    {router_c.route(test_message)}")  # placeholder explícito con warning
```

## Severidad
SISTÉMICO — Cap.10-20

Este anti-patrón fue detectado en 9 de 10 capítulos analizados del libro. No es un error puntual sino un patrón de diseño defectuoso aplicado consistentemente a lo largo del texto. Las consecuencias son acumulativas: cada mecanismo nombrado sin implementación real es un punto donde:

1. **Evaluadores de arquitectura** sobreestiman la robustez del sistema
2. **Desarrolladores que extienden el código** construyen sobre premisas falsas
3. **Tests de integración** pueden pasar porque los placeholders no lanzan errores
4. **Revisiones de seguridad** ven "AdaptiveGuardrails" y asumen que existen guardrails reales

### Instancias documentadas en el análisis

| Capítulo | Mecanismo nombrado | Implementación real |
|----------|-------------------|---------------------|
| Cap.10 | Resource-Aware Agent | Agente sin monitoreo de recursos |
| Cap.11 | Self-Healing System | Sistema sin recuperación automática |
| Cap.12 | Semantic Router | if/elif sobre strings |
| Cap.13 | Adaptive Guardrails | Thresholds hardcoded, sin adaptación |
| Cap.14 | Intelligent Escalation | Escalación incondicional |
| Cap.15 | Dynamic Prioritization | Cola FIFO sin priorización |
| Cap.16 | Context-Aware Memory | Almacenamiento plano sin contexto |
| Cap.17 | Autonomous Recovery | `pass` en el handler de errores |
| Cap.20 | Smart Load Balancer | Round-robin sin métricas de carga |

### Regla de detección

Un mecanismo está "nombrado sin implementación" si:
- El nombre contiene: Adaptive, Intelligent, Smart, Dynamic, Semantic, Self-*, Autonomous, Context-Aware
- Y el cuerpo del método/clase no contiene lógica que justifique ese adjetivo
- O contiene solo `pass`, `TODO`, `return True`, o `return {}` sin procesamiento real
