```yml
type: Análisis
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 03:51:36
purpose: Determinar si pm-thyrox debe permanecer como SKILL o migrar a otra arquitectura
reversibility: reversible
```

# Análisis: Revisión Arquitectónica de pm-thyrox SKILL

## 1. Objetivo y por qué importa

El análisis SKILL-vs-AGENT de FASE 20 concluyó que pm-thyrox debería ser un "thin orchestrator SKILL".
Esa conclusión tenía **dos errores de framing** identificados por el usuario con evidencia externa:

1. Asumió que SKILLs son confiables — no lo son (triggering probabilístico)
2. Asumió que SKILL es "la única opción viable" — CLAUDE.md es una alternativa más confiable

**Objetivo:** Producir una decisión arquitectónica fundamentada (ADR) sobre el mecanismo correcto
para pm-thyrox, con evidencia documentada de las limitaciones de cada alternativa.

---

## 2. Evidencia externa incorporada

### 2.1 Artículo: "The Ultimate Guide to Claude Code Skills" (Mar 15, 2026)

Fuente: artículo publicado en Substack, basado en análisis de 200+ skills en docenas de repositorios.

Hallazgos clave con evidencia empírica:

**H1 — Triggering probabilístico**
> "Skills are not deterministic. You can write the perfect skill, install it correctly, name it beautifully — and Claude Code might just... not use it."
> Evidencia: 20 prompts que deberían disparar una CPO review skill → 0 disparos.

**H2 — SKILLs como prompt injection**
> "Skills are prompt injections. That's it. They're markdown files that get loaded into Claude's context when triggered. Nothing more magical than that."
> Evidencia: 40 de 47 skills instaladas empeoraron el output vs vanilla Claude Code.

**H3 — CLAUDE.md como alternativa superior en simplicidad**
> "Why not just stick with a well-written system prompt in your CLAUDE.md? It's simpler, always loads, doesn't have trigger reliability issues, and is easier to iterate on."

**H4 — El 20% que funciona tiene una condición**
> "That remaining 20% — the skills built by people who actually know the domain, who've iterated on evaluation, who've tested edge cases — can produce output that's measurably sharper."
> Condición: domain expertise + iteración sobre evaluación + testing de edge cases.

**H5 — Evaluación ausente en el ecosistema**
> "Until recently, there was no built-in way to benchmark a skill against baseline Claude Code output. You'd install a skill, use it for a week, and have a vague feeling that it might be better."

### 2.2 Análisis de hallazgos previos (contexto de esta sesión)

**H-API — PTC y Tool Search son superiores pero no disponibles en Claude Code**
Anthropic tiene Tool Search Tool + Programmatic Tool Calling (PTC) en la API.
PTC: una sola sesión Python puede orquestar 50 herramientas sin round-trips adicionales.
Estado: beta en API, **no disponible en Claude Code Web**.
Implicación: la limitación es de producto, no arquitectónica — puede cambiar.

**H-SCALE — Truncación de descripciones al escalar**
El presupuesto de context para SKILL descriptions = ~1% del context window, asignado dinámicamente.
THYROX actual: 16 skills (1 pm-thyrox + 7 tech + 8 workflow).
En este rango, la truncación de keywords puede ya estar ocurriendo.

---

## 3. Estado actual de la arquitectura

```
Claude Code (sesión)
│
├─ Cargado siempre: CLAUDE.md (~80 líneas útiles)
│   └─ Flujo de sesión: "Invocar pm-thyrox antes de trabajar"
│
├─ Cargado si se invoca: pm-thyrox SKILL (~430+ líneas)
│   └─ Lógica completa de 7 fases, gates, manifest, calibración
│
├─ Invocados por usuario: /workflow_* commands (8 comandos, ~40-50 líneas c/u)
│   └─ Phase-specific entry points — desactualizados vs SKILL.md
│
└─ Lanzados por Claude: agentes nativos (9 en .claude/agents/)
    └─ task-executor, task-planner, tech-detector, Explore, etc.
```

**Problema observado:** La instrucción "Invocar pm-thyrox" en CLAUDE.md es un recordatorio humano,
no un trigger automático. El skill aún depende de que Claude lo invoque correctamente.

**Mitigación actual:** session-start.sh imprime el recordatorio en cada sesión. Reduce pero no elimina la probabilidad de que Claude olvide invocar el skill.

---

## 4. Las 4 alternativas arquitectónicas para pm-thyrox

### A) Status quo: pm-thyrox como SKILL monolítica (~430 líneas)

**Cómo funciona:** Claude invoca Skill tool → pm-thyrox → lógica de 7 fases inyectada en contexto.

**Problemas documentados:**
- Triggering probabilístico — puede no activarse
- Descripción corta (truncable) vs cuerpo largo (costoso en tokens)
- Crece con cada FASE añadida → drift hacia inmantenibilidad
- SKILL viola su propia definición (múltiples responsabilidades)

**Ventajas:**
- Funciona hoy (con mitigaciones)
- Todo el framework en un lugar
- Activable bajo demanda (no siempre en contexto)

### B) CLAUDE.md como orquestador principal (migración total)

**Cómo funciona:** Mover lógica de flujo de sesión + principios core a CLAUDE.md.
Las instrucciones de fase se mueven a workflow_* commands.
pm-thyrox SKILL se elimina o se reduce a descripción de activación.

**Ventajas:**
- Siempre cargado — sin probabilistic triggering
- No consume presupuesto de SKILL descriptions
- Más simple de mantener
- Session-start.sh ya complementa este approach

**Problemas:**
- CLAUDE.md con 430+ líneas es pesado para CADA sesión (aunque no sea de PM)
- Sessions no-PM (debug rápido, preguntas) cargan la lógica completa sin necesidad
- CLAUDE.md no es on-demand — todo o nada
- Riesgo: context window usado por PM overhead en sesiones técnicas puras

### C) Thin orchestrator: CLAUDE.md + pm-thyrox SKILL mínima + workflow_* commands

**Cómo funciona:**
- CLAUDE.md: flujo de sesión (~20 líneas), sin lógica de fase
- pm-thyrox SKILL: descripción + referencia a comandos (~50 líneas)
- workflow_* commands: lógica completa de cada fase (por demanda, ~50-80 líneas c/u)

**Ventajas:**
- Workflow-specific logic on-demand (no siempre en contexto)
- CLAUDE.md sigue ligero
- pm-thyrox SKILL corta = mejor tasa de disparo (descripción no truncada)
- Arquitectura correcta (un comando = una fase)

**Problemas:**
- workflow_* commands desactualizados (no tienen gates, manifest, calibración de FASE 19)
- Sincronizar 7 commands con SKILL.md actual = WP formal de migración
- Aún depende de triggering de pm-thyrox SKILL (aunque sea más corta)

### D) CLAUDE.md flujo + sin SKILL central + workflow_* autónomos

**Cómo funciona:**
- CLAUDE.md: flujo de sesión + referencia directa a /workflow_* (sin invocar SKILL)
- workflow_* commands: completos y autónomos (cada uno contiene lo que necesita)
- pm-thyrox SKILL: solo para proyectos externos que quieran usar el framework como biblioteca

**Ventajas:**
- Elimina el punto de falla de triggering de pm-thyrox
- workflow_* commands son los únicos artefactos que necesitan mantenimiento
- Máximo modularidad

**Problemas:**
- Duplicación entre commands: cada uno necesita sus propios principios, nomenclatura, etc.
- Sin orquestador central, ¿quién detecta el WP activo y el estado?
- Pierde la capacidad de "cargar el framework completo" bajo demanda

---

## 5. Análisis de confiabilidad por mecanismo

| Mecanismo | Garantía de carga | Overhead en sesiones no-PM | Actualizable sin migración |
|-----------|------------------|--------------------------|--------------------------|
| CLAUDE.md | 100% siempre | Alto (carga todo) | Sí, directamente |
| pm-thyrox SKILL (actual, ~430 líneas) | Probabilística | Bajo (solo si se invoca) | Sí, directamente |
| pm-thyrox SKILL (thin, ~50 líneas) | Probabilística, menor riesgo | Bajo | Sí |
| workflow_* commands | 100% cuando usuario invoca | Bajo (por demanda) | Sí, independientemente |
| session-start.sh reminder | 100% (hook) | Negligible | Sí |

**Observación clave:** La combinación `CLAUDE.md (flujo ligero) + session-start.sh (reminder) + workflow_* (on-demand)` tiene mejor perfil de confiabilidad que depender de triggering probabilístico de una SKILL.

---

## 6. La condición del 20% que funciona

El artículo identifica que el 20% de skills que mejoran el output tiene 3 características:
1. **Domain expertise** — escrita por alguien que conoce el dominio profundamente
2. **Evaluación iterativa** — comparada contra baseline, no por vibes
3. **Edge cases documentados** — los casos límite están probados

**¿pm-thyrox cumple estas condiciones?**

| Condición | Estado en pm-thyrox |
|-----------|-------------------|
| Domain expertise | ✓ — metodología SDLC bien documentada, 20 FASEs de iteración |
| Evaluación iterativa | ✗ — nunca se comparó contra "Claude sin pm-thyrox" en la misma tarea |
| Edge cases documentados | ~ Parcial — L-001..L-081 capturan edge cases pero no son benchmarks |

**Conclusión:** pm-thyrox tiene domain expertise pero carece de evaluación formal.
No sabemos si mejora o empeora el output vs CLAUDE.md bien escrito + prompts directos.

---

## 7. El caso específico de pm-thyrox: ¿SKILL o CLAUDE.md?

La pregunta correcta no es "¿es SKILL el mecanismo correcto?" sino:
**"¿Cuándo el usuario necesita el framework y cuándo no?"**

**Necesita el framework:**
- Al iniciar un WP nuevo (Phase 1 ANALYZE)
- Al retomar un WP activo
- Al cambiar de fase (cualquier transición)
- Al ejecutar tareas complejas con agentes

**No necesita el framework:**
- Debug rápido de código
- Pregunta técnica puntual
- Sesión de solo lectura / exploración
- Cualquier tarea < 30 min sin WP

**Implicación:** Si pm-thyrox viviera en CLAUDE.md completamente, cargaría sus ~430 líneas en CADA sesión, incluyendo las que no lo necesitan. Eso es overhead real en context window.

**La solución correcta:** CLAUDE.md tiene el flujo mínimo (qué hacer al inicio de sesión + cómo detectar WP activo) + session-start.sh como recordatorio. La lógica detallada de las fases vive en workflow_* commands (on-demand).

---

## 8. Restricciones del entorno

| Restricción | Impacto en decisión |
|-------------|-------------------|
| Claude Code Web — sin PTC | PTC no disponible; orquestación por prompt, no código |
| Claude Code Web — sin Tool Search API | Tool Search disponible internamente (deferred tools), no para SKILLs usuario |
| CLAUDE.md siempre cargado | Ventaja de confiabilidad, desventaja de overhead |
| workflow_* desactualizados | Costo de migración real — sincronización = WP separado |
| 16 SKILLs activas (potencial truncación) | Argumento adicional para reducir pm-thyrox SKILL |

---

## 9. Criterios de éxito para este WP

1. ADR firmado con decisión arquitectónica documentada y justificada
2. Evaluación formal (aunque mínima) de pm-thyrox vs baseline
3. Plan de migración concreto si la decisión requiere cambios
4. TD-006 actualizado con los hallazgos de este análisis

---

## 10. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Migración rompe el flujo actual | Media | Alto | Migración gradual; mantener SKILL durante transición |
| workflow_* desactualizados producen inconsistencias | Alta | Medio | Sincronizar commands antes de eliminar SKILL |
| CLAUDE.md con demasiado contenido | Media | Medio | Límite explícito de líneas para sección PM en CLAUDE.md |
| Decisión equivocada sin evaluación formal | Media | Medio | Benchmarking mínimo antes de ADR |
| PTC llega a Claude Code y cambia todo | Baja | Alto | ADR debe ser revisable cuando PTC esté disponible |

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo presentado | Esperar "SI" del usuario para avanzar a Phase 2 |
| SP-02 | 2→3 | gate-fase | Strategy + ADR preliminar presentados | Esperar "SI" del usuario |
| SP-03 | 3→4 | gate-fase | Plan de migración (scope) aprobado | Esperar "SI" del usuario |
| SP-04 | 4→5 | gate-fase | Spec + evaluación mínima aprobada | Esperar "SI" del usuario |
| SP-05 | 5→6 | gate-fase | Task-plan aprobado | Esperar "SI" del usuario |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas + validación pre-7 | Esperar "SI" del usuario |
