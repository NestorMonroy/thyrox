```yml
Tipo: Phase 7 — TRACK
Work package: 2026-04-01-18-39-56-skill-activation-failure
Fecha: 2026-04-01
```

# Lecciones Aprendidas — SKILL Activation Failure

## L-001: Usar el SKILL antes de analizar el SKILL

**Qué pasó:** Se analizó el problema de activación sin primero seguir el flujo del SKILL (Phase 1: ANALYZE). Se saltó directamente a proponer soluciones.

**Raíz:** El modelo leyó CLAUDE.md como texto informativo, no como instrucción. La sección "Flujo de sesión" usaba lenguaje descriptivo ("todo trabajo pasa por el SKILL") en lugar de imperativo ("ANTES de responder: invocar Skill tool").

**Fix aplicado:** T-001 — CLAUDE.md con "OBLIGATORIO", pasos numerados, instrucción explícita de invocar Skill tool.

**Regla:** Si el CLAUDE.md no contiene la palabra OBLIGATORIO y un imperativo claro, el modelo lo trata como contexto, no como instrucción.

---

## L-002: Timestamps reales en work packages

**Qué pasó:** Work package creado con timestamp `00-00-00` en lugar del tiempo real de ejecución.

**Raíz:** El modelo generó un timestamp placeholder en vez de ejecutar `date +%H-%M-%S`.

**Fix aplicado:** Renombrado via `git mv`; convención documentada en spec.md.

**Regla:** Siempre usar `date +%Y-%m-%d-%H-%M-%S` al crear work packages. Nunca usar ceros ni placeholders.

---

## L-003: Baja Libertad solo en gates, no en contenido

**Qué pasó:** Riesgo de hacer todo el SKILL.md "Baja Libertad" y perder flexibilidad para modelos capaces.

**Raíz:** La distinción entre gates (instrucciones de control de flujo) y contenido (instrucciones de trabajo) no era explícita.

**Fix aplicado:** Principio en spec.md: REQUERIDO/SIEMPRE/NO avanzar solo en puntos de control; el contenido de cada fase permanece en "Alta Libertad".

**Regla:** Baja Libertad en: "Salir cuando", "Siguiente", "REQUERIDO:", instrucciones de template. Alta Libertad en: el trabajo dentro de la fase.

---

## L-004: Investigar antes de descartar opciones

**Qué pasó:** La opción de startup hook (Option C) fue descartada prematuramente sin investigar si existía infraestructura para implementarla.

**Raíz:** Respuesta basada en suposiciones ("un hook solo actúa al inicio, no garantiza...") sin verificar qué hooks existían en el proyecto.

**Fix aplicado:** Investigación reveló `scripts/` con hooks existentes y skill `session-start-hook` disponible. Se implementó como capa adicional (D1: triple capa).

**Regla:** Antes de descartar una opción de diseño, verificar si existe infraestructura que la soporte.

---

## L-005: Documentar mitigación de riesgos, no solo riesgos

**Qué pasó:** "Riesgo de degradación: Ninguno" fue marcado sin plan de mitigación. El usuario lo señaló como insuficiente.

**Raíz:** Identificar un riesgo bajo no es lo mismo que documentar cómo se previene que sea bajo.

**Fix aplicado:** Tabla de mitigación en spec.md: baseline 40/40, prueba incremental por tarea, criterio de revert, constraint de aditividad.

**Regla:** Todo riesgo necesita: probabilidad + impacto + mitigación concreta + criterio de revert.

---

## Métricas del work package

- Tareas completadas: 11/11 (T-001 a T-011)
- Evals: 14/14 (100%) — sin degradación
- SKILL.md: 221 líneas (< 500 límite)
- Commits: 3 (rename WP, fase 6 primer bloque, fase 6 segundo bloque)
- Deuda técnica pendiente: T-DT-001 (examples.md — nomenclatura de fases)
