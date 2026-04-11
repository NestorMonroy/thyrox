---
name: Spec (SDD)
description: Genera especificaciones completas siguiendo Specification-Driven Development (SDD = TDD + DbC). Combina collaborative tests (Given/When/Then) con contratos formales (precondiciones, postcondiciones, invariantes). Usar cuando se necesita especificar el comportamiento de un componente, feature o UC antes de implementarlo — especialmente cuando hay lógica de negocio compleja, APIs públicas, o múltiples variantes de input.
---

# /thyrox:spec — Specification-Driven Development

Produce una especificación **completa** que combina:
- **TDD layer**: Collaborative tests (escenarios concretos Given/When/Then)
- **DbC layer**: Contratos formales (precondiciones, postcondiciones, invariantes)

La spec resultante es más completa que una requirements-spec pura (TDD solo):
los contratos cubren todos los inputs posibles; los tests capturan comportamiento
traza que los contratos no pueden expresar.

---

## Cuándo usar este comando vs /thyrox:structure

| `/thyrox:structure` | `/thyrox:spec` |
|---------------------|----------------|
| Phase 4 completa del WP activo | Especificación SDD de un UC, feature o componente |
| Produce requirements-spec.md del WP | Produce spec SDD standalone |
| TDD (Given/When/Then) como acceptance criteria | TDD + DbC (tests + contratos) |
| Ligado al work package activo | Puede usarse independientemente de fases |
| Para cualquier tipo de WP | Para features con lógica de negocio compleja |

---

## Ciclo SDD — Protocolo

### 1. Input

El usuario provee: feature, componente o UC a especificar.
Si no se provee, preguntar antes de continuar.

### 2. Análisis previo

Leer documentación relevante existente:
- Si hay WP activo: leer `*-analysis.md` y `*-solution-strategy.md`
- Si es standalone: leer la descripción del usuario y hacer preguntas de clarificación

### 3. Collaborative Specifications (TDD layer)

Para CADA UC o comportamiento identificado, escribir escenarios:

```
Given [estado inicial — precondición implícita]
When  [acción o evento]
Then  [resultado verificable]
And   [condición adicional]

# Escenarios requeridos:
- Flujo nominal (happy path)
- Flujos alternativos (variantes válidas)
- Escenarios de error (precondición violada, input inválido)
- Propiedades traza si aplica (comportamiento entre llamadas)
```

### 4. Contractual Specifications (DbC layer)

Para CADA componente/operación, definir contratos:

```
Precondiciones (require):
  - [condición que debe ser verdadera ANTES de la operación]
  - Nota: los escenarios de error del paso 3 deben mapear a precondiciones violadas

Postcondiciones (ensure):
  - [condición que debe ser verdadera DESPUÉS de la operación]
  - Incluir relaciones entre estado nuevo y estado anterior (old value)
  - Los escenarios nominales del paso 3 deben verificar estas postcondiciones

Invariantes (invariant):
  - [condición que debe ser verdadera SIEMPRE]
  - Aplica antes Y después de cualquier operación sobre el componente
```

### 5. Test Amplification — Validación de consistencia

⏸ **Pausa obligatoria**: verificar consistencia entre TDD y DbC layers:

```
Checks:
□ Cada precondición tiene ≥1 escenario de error que la viola
□ Cada postcondición tiene ≥1 escenario nominal que la verifica
□ Los contratos no contradicen los tests
□ Los contratos no son más débiles que lo que los tests demuestran
□ Las propiedades traza están en tests (no en contratos)
□ No hay escenarios sin cobertura contractual
```

Si faltan escenarios: agregar tests para ejercitar los contratos no cubiertos.
Si los contratos son débiles: refinar hasta que capturen toda la intención.

### 6. Formato de salida

```markdown
# Spec SDD — [Nombre del feature/componente]

## Contexto
[Descripción breve del qué y por qué]

## Collaborative Specifications (TDD)

### [UC-001 / Escenario nombre]
Given [estado inicial]
When  [acción]
Then  [resultado]

### [UC-001 — error]
Given [precondición violada]
When  [acción]
Then  [error específico]

## Contractual Specifications (DbC)

### [Componente / Operación]

**Precondiciones:**
- [condición 1]
- [condición 2]

**Postcondiciones:**
- [resultado garantizado]
- [relación con estado anterior]

**Invariantes:**
- [siempre verdadero]

## Check de consistencia SDD
□ Cada precondición cubierta por escenario de error
□ Cada postcondición verificada por escenario nominal
□ Contratos no contradicen tests
□ Propiedades traza en tests
```

---

## Referencia metodológica

Ver [`sdd.md`](.claude/references/sdd.md) para el fundamento teórico completo
(Ostroff, Makalsky, Paige — Agile Specification-Driven Development).
