```yml
Tipo: Referencia PHASE 1: ANALYZE
Categoría: Introducción
Versión: 1.0
Propósito: Introduce los conceptos fundamentales del análisis. Base para entender las 7 subsecciones de PHASE 1.
Objetivo: Proporcionar context general y explicar estructura de análisis de requisitos.
Fecha actualización: 2026-03-25
```

# Introduction and Goals (ARC42 Section 1)

## Propósito

Introduce los conceptos fundamentales del análisis. Base para entender las 7 subsecciones de PHASE 1.

> Objetivo: Proporcionar context general y explicar estructura de análisis de requisitos.

---

## Subsecciones (1.1 - 1.4)

### 1.1: Basic Requirements

**Define:** QUÉ debe hacer el sistema

**Estructura:**
- Requisitos generales (nivel 1)
- Requisitos específicos (nivel 2)
- Verificables y trazables

**Entregable:** Tabla de requisitos con ID, descripción, prioridad

Consultar: [requirements.md](./requirements.md)

---

### 1.2: Quality Goals

**Define:** QUÉ TAN BIEN debe hacerlo

**Estructura:**
- Priority 1, 2, 3 (jerarquización)
- Quality attribute (correctness, security, performance, etc)
- Scenario (verificable)

**Entregable:** Matriz de Quality Goals por prioridad

Consultar: [quality-goals.md](./quality-goals.md)

---

### 1.3: Stakeholders

**Define:** QUIÉN usa el sistema y QUÉ necesita

**Estructura:**
- Role (ocupacional, no nombres)
- Description (qué hacen)
- Goal / Intention (qué necesitan)

**Entregable:** Tabla de Stakeholders

Consultar: [stakeholders.md](./stakeholders.md)

---

### 1.4: Context / Scope (Opcional en PHASE 1)

**Define:** DÓNDE está el sistema y cuál es su límite

**Estructura:**
- Business context (sistemas vecinos)
- Technical context (dependencias)
- Scope (qué incluye/excluye)

**Entregable:** Diagrama de contexto

Consultar: [context.md](./context.md)

---

## Flujo en PHASE 2: ANALYZE

```
PHASE 2: ANALYZE - Tu responsabilidad es completar:

1. introduction.md (este documento - entender propósito)
   ↓
2. requirements.md (Basic Requirements - QUÉ)
   ↓
3. quality-goals.md (Quality Goals - QUÉ TAN BIEN)
   ↓
4. stakeholders.md (Stakeholders - QUIÉN)
   ↓
5. basic-usage.md (Basic Usage - CÓMO funciona)
   ↓
6. constraints.md (Constraints - QUÉ limita)
   ↓
7. context.md (Context - DÓNDE está)

Deliverable: ARC42 Section 1, 2, 3 COMPLETO
```

---

## Templates Disponibles

Para cada subsección, hay un template:

- `requirements-analysis.md.template` - Estructura para Requirements
- `quality-goals.md.template` - Estructura para Quality Goals
- `stakeholders.md.template` - Estructura para Stakeholders
- `basic-usage.md.template` - Estructura para Basic Usage
- `constraints.md.template` - Estructura para Constraints
- `context.md.template` - Estructura para Context

---

## Cómo Usar Esta Fase

### Paso 1: Completar introduction.md
Crear documento con visión general (2-3 párrafos)

### Paso 2-7: Usar templates
Para cada subsección, usar template correspondiente

### Paso 8: Aprobación
Cada documento debe ser aprobado antes de continuar

### Paso 9: Siguiente fase
Una vez completo → PHASE 3: SOLUTION_STRATEGY

---

## Checklist PHASE 2: ANALYZE

- [ ] introduction.md completado
- [ ] requirements.md completado (Requirements Analysis)
- [ ] quality-goals.md completado
- [ ] stakeholders.md completado
- [ ] basic-usage.md completado
- [ ] constraints.md completado
- [ ] context.md completado
- [ ] Todos aprobados por usuario

**Si NO → PAUSE - Completar antes de continuar**

---

## Relación con Otras Fases

**Entra de:**
- PHASE 1: PLAN (plan general)

**Sale hacia:**
- PHASE 3: SOLUTION_STRATEGY (define cómo cumplir estos requisitos)
- PHASE 4: STRUCTURE (especificaciones basadas en estos requisitos)

---

**Última actualización**: 2026-02-01
