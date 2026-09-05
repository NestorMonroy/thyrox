```yml
Fecha: 2026-03-27
Proyecto: THYROX
Versión análisis: 1.0
Autor: Claude Code + Human
Estado: En progreso
```

# Introduction and Goals: THYROX

## Propósito

Establece el contexto general del proyecto THYROX. Define QUÉ es, POR QUÉ existe, PARA QUIÉN, y cuál es su objetivo general.

---

## Visión General

THYROX (Tracking Hierarchy Yield Roadmap Organization eXecution) es un framework de gestión de proyectos diseñado para trabajar con Claude Code. Su propósito es proporcionar una metodología estructurada en 7 fases SDLC que permite planificar, documentar, ejecutar y trackear proyectos de software de forma repetible.

El framework existe porque trabajar con AI assistants sin una estructura definida produce trabajo desorganizado — sin trazabilidad, sin documentación consistente, y sin un flujo claro de decisiones. THYROX resuelve esto proporcionando un SKILL reutilizable que define exactamente cómo analizar, planificar, estructurar, ejecutar y monitorear cualquier proyecto.

THYROX está dirigido a desarrolladores y equipos que usan Claude Code como herramienta de desarrollo. El usuario típico necesita gestionar proyectos de cualquier tamaño (desde fixes de 30 minutos hasta features de semanas) con documentación automática, commits convencionales, y un flujo de trabajo claro que persiste entre sesiones.

---

## Objetivo General

Crear un template reutilizable que permita:

1. **Gestión estructurada** — 7 fases SDLC con entradas/salidas claras por fase
2. **Documentación auto-generada** — Desde análisis hasta changelog, todo documentado
3. **Trazabilidad** — Cada decisión, cambio y resultado rastreado con ADRs, work-logs y epics
4. **Reutilización** — El SKILL y sus references/assets/scripts se pueden copiar a cualquier proyecto nuevo
5. **Escalabilidad** — Proyectos pequeños usan fases 1,2,6,7; grandes usan las 7 completas

---

## Jerarquía del Framework

```
SKILL.md              ← Motor (define metodología y fases)
    ↓
CLAUDE.md             ← Puente (contexto persistente entre sesiones)
    ↓
README.md             ← Presentación (entrada para humanos)
```

El SKILL es lo primero que se lee. CLAUDE.md conecta el SKILL con el proyecto real. README.md es la puerta de entrada para nuevos colaboradores.

---

## Estructura del SKILL

```
pm-thyrox/
├── SKILL.md          ← Instrucciones (7 fases, <500 líneas ideal)
├── scripts/          ← Código ejecutable (detect, convert, validate)
├── references/       ← Documentación cargada en contexto cuando se necesita
└── assets/           ← Templates copiados para generar output
```

Sigue la anatomía oficial de Anthropic para skills.

---

## Las 7 Fases

```
Phase 1: ANALYZE           → Entender requisitos, stakeholders, contexto
Phase 2: SOLUTION_STRATEGY → Plan arquitectónico, decisiones técnicas
Phase 3: PLAN              → Scope, brainstorm, actualizar ROADMAP.md
Phase 4: STRUCTURE         → PRDs o Spec-Driven docs (opcional)
Phase 5: DECOMPOSE         → Descomponer en tasks atómicas
Phase 6: EXECUTE           → Implementar + commits convencionales
Phase 7: TRACK             → Monitorear, changelog, cierre
```

**Siempre empezar por ANALYZE.** No planificar sin entender primero.

---

## Próximas Subsecciones

Este documento es el inicio de PHASE 1: ANALYZE. Las subsecciones que siguen son:

1. **Requirements Analysis** — Qué debe hacer THYROX
2. **Use Cases** — Cómo se usa el framework en la práctica
3. **Quality Goals** — Qué tan bien debe funcionar
4. **Stakeholders** — Quiénes lo usan y qué necesitan
5. **Basic Usage** — Cómo funciona operacionalmente
6. **Constraints** — Qué limita la solución
7. **Context** — Sistemas externos y límites

---

## Siguiente Paso

→ Pasar a [requirements-analysis](requirements-analysis.md)
