```yml
created_at: 2026-04-15 00:00:00
project: THYROX
work_package: 2026-04-15-08-29-58-plugin-distribution
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# SDLC — Software Development Life Cycle

## ¿Qué es?

El SDLC es un marco de proceso estructurado para el desarrollo de software. Define un conjunto de fases secuenciales que guían el ciclo completo de vida de un sistema: desde la identificación de una necesidad hasta su retiro.

No es una metodología única — es una familia de enfoques (Waterfall, V-Model, Iterativo, Espiral, Agile) que comparten la misma estructura de fases pero difieren en cómo se ejecutan y en qué orden se iteran.

---

## Fases del SDLC (modelo clásico)

| # | Fase | Pregunta central | Entregable principal |
|---|------|-----------------|---------------------|
| 1 | **Planning** | ¿Vale la pena construirlo? | Feasibility study, project charter |
| 2 | **Requirements Analysis** | ¿Qué debe hacer el sistema? | SRS (Software Requirements Specification) |
| 3 | **System Design** | ¿Cómo lo construiremos? | Architecture document, HLD, LLD |
| 4 | **Implementation** | ¿Cómo lo codificamos? | Código fuente, unit tests |
| 5 | **Testing & Integration** | ¿Funciona correctamente? | Test reports, bug reports |
| 6 | **Deployment** | ¿Cómo lo entregamos? | Release notes, deployment guide |
| 7 | **Maintenance** | ¿Cómo lo sostenemos? | Change requests, patches, updates |

---

## Variantes principales

### Waterfall (secuencial estricto)
Cada fase termina completamente antes de iniciar la siguiente.
- **Fortaleza:** Documentación exhaustiva, trazabilidad total
- **Debilidad:** Cambios tardíos son costosos; feedback loop largo

### V-Model (verificación y validación)
Cada fase de desarrollo tiene una fase de testing espejo.
```
Requirements ←→ Acceptance Testing
System Design ←→ System Testing
Architecture  ←→ Integration Testing
Implementation ←→ Unit Testing
```

### Iterativo / Incremental
El sistema se construye en ciclos cortos. Cada iteración recorre fases 2-6.
- **Fortaleza:** Feedback temprano, entregas parciales funcionales

### Espiral (risk-driven)
Combina diseño iterativo con análisis de riesgo explícito en cada vuelta.
Cuadrantes por ciclo: Determinar objetivos → Identificar riesgos → Desarrollar → Planificar siguiente ciclo.

---

## Tipo de flujo

Según la taxonomía de flexibilidad del proyecto:

| Variante | Tipo YAML | Coordinator mode |
|---------|-----------|-----------------|
| Waterfall | `sequential` | prescriptive |
| V-Model | `sequential` | prescriptive |
| Iterativo | `cyclic-adaptive` | soft gates |
| Espiral | `cyclic-adaptive` | risk-gated |
| Agile SDLC | `adaptive` | inquiry |

---

## Relación con THYROX

THYROX no implementa SDLC — THYROX es el framework que puede **orquestar** SDLC como una de las 12 metodologías soportadas.

| THYROX phase | SDLC phase equivalente |
|---|---|
| DISCOVER | Planning (necesidad de negocio) |
| MEASURE | Requirements Analysis (baseline actual) |
| ANALYZE | Requirements Analysis (gaps y root cause) |
| CONSTRAINTS | Requirements Analysis (restricciones no funcionales) |
| STRATEGY | System Design (arquitectura de alto nivel) |
| PLAN | Planning (scope, cronograma, recursos) |
| DESIGN/SPECIFY | System Design (LLD, especificación detallada) |
| PLAN EXECUTION | Implementation prep (task breakdown) |
| PILOT/VALIDATE | Testing & Integration (PoC, integración temprana) |
| EXECUTE | Implementation |
| TRACK/EVALUATE | Testing & Integration + Deployment |
| STANDARDIZE | Maintenance (documentación, transfer) |

**Nota:** La correspondencia no es 1:1. THYROX añade fases que SDLC clásico asume implícitas (MEASURE, CONSTRAINTS, PILOT/VALIDATE, STANDARDIZE).

---

## Clasificación en el landscape de metodologías

- **Categoría:** Marco metodológico de desarrollo de software
- **Flexibilidad:** Baja-Media (depende de la variante)
- **Alcance:** End-to-end (inception → retirement)
- **Dominio:** Ingeniería de software
- **Instancias conocidas:** Waterfall, V-Model, RUP (basado en SDLC iterativo), Spiral
