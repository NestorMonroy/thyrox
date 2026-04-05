```yml
Fecha: 2026-03-27
Proyecto: THYROX
Versión Quality Goals: 1.0
Autor: Claude Code + Human
Estado: Borrador
Metas definidas: 9
```

# Quality Goals: THYROX

## Propósito

Documentar QUÉ TAN BIEN debe funcionar THYROX como framework de gestión de proyectos.

> Objetivo: Especificar atributos de calidad priorizados que guían todas las decisiones del framework.

---

## Priority 1: Critical

| Quality Goal | Scenario |
|--------------|----------|
| Correctness | La numeración de fases es consistente en TODOS los archivos del proyecto (SKILL.md, CLAUDE.md, README.md, references, templates) |
| Traceability | Cada decisión, cambio y artefacto está documentado con ubicación definida (decisions/, analysis/, epics/, work-logs/) |
| Persistence | El contexto del proyecto sobrevive entre sesiones de Claude Code a través de CLAUDE.md y project-state.md |

---

## Priority 2: Important

| Quality Goal | Scenario |
|--------------|----------|
| Reusability | El directorio pm-thyrox/ (SKILL + references + scripts + assets) se puede copiar a un proyecto nuevo y funciona sin modificación |
| Standards | La estructura sigue la anatomía oficial de Anthropic (SKILL.md + scripts/ + references/ + assets/) |
| Maintainability | SKILL.md se mantiene bajo 500 líneas usando progressive disclosure hacia references/ |

---

## Priority 3: Desirable

| Quality Goal | Scenario |
|--------------|----------|
| Automation | Los scripts siguen el patrón detect/convert/validate con responsabilidad única |
| Flexibility | Un proyecto de 30 minutos usa fases 1,2,6,7; uno de semanas usa las 7 fases completas |
| Self-documentation | Conventional commits + CHANGELOG.md + ROADMAP.md generan documentación de progreso automáticamente |

---

## Trade-offs and Resolutions

**Trade-off 1: Correctness vs Maintainability**
- Tension: Mantener consistencia en 20+ archivos es costoso
- Resolution: Scripts de validación automatizan la detección de inconsistencias
- Decision: Correctness es Priority 1, Maintainability es Priority 2

**Trade-off 2: Reusability vs Flexibility**
- Tension: Un template rígido es más reutilizable pero menos flexible
- Resolution: Escalabilidad por complejidad (quick/standard/full mode)
- Decision: El framework se adapta, no se impone

**Trade-off 3: Standards vs Simplicity**
- Tension: Seguir la anatomía oficial agrega complejidad (4 carpetas vs 1)
- Resolution: La separación scripts/references/assets reduce confusión a largo plazo
- Decision: Standards compliance es Priority 2, la complejidad inicial se paga con claridad posterior

---

## Validación Checklist

- [x] Priority 1 claramente definida
- [x] Priority 2 claramente definida
- [x] Priority 3 claramente definida
- [x] Cada goal tiene scenario específico
- [x] Scenarios son medibles
- [x] Scenarios son verificables
- [x] Trade-offs identificados
- [x] Trade-offs resueltos

---

## Siguiente Paso

→ Pasar a [stakeholders](stakeholders.md)
