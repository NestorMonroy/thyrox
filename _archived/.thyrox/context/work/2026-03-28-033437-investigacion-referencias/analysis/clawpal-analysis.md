```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/clawpal/
Nota: Ignoramos la funcionalidad de instalador, analizamos solo el project management
```

# Análisis: clawpal — Planes inmutables con fecha, design+impl pairs

## Qué es relevante para nosotros

No el instalador. Lo relevante es **cómo organizan el trabajo**: 48 documentos de plan con fecha en 14 días, design+implementation pairs, cc.md como feedback loop, checklists por versión.

---

## El patrón de 48 planes con fecha

```
docs/plans/
├── 2026-02-15-clawpal-mvp-design.md
├── 2026-02-15-clawpal-mvp-implementation-plan.md
├── 2026-02-16-clawpal-product-redesign.md
├── 2026-02-17-recipe-engine-redesign.md
├── 2026-02-22-doctor-2x2-matrix-design.md
├── 2026-02-25-zeroclaw-orchestrator-design.md
└── ... (48 archivos en 14 días)
```

**Reglas del patrón:**
1. **Naming:** `YYYY-MM-DD-feature-name.md`
2. **Inmutables:** Una vez escritos, no se editan. Si cambia el diseño, se crea nuevo archivo con nueva fecha.
3. **Pairs:** Cada feature tiene DOS documentos: design (qué/por qué) + implementation-plan (cómo/pasos)
4. **~3-4 documentos por día** de trabajo
5. **Trail histórico:** Puedes ver cuándo cambió cada decisión por la fecha del archivo

### Design doc vs Implementation plan

| | Design | Implementation Plan |
|---|---|---|
| **Pregunta** | ¿Qué y por qué? | ¿Cómo, paso a paso? |
| **Contiene** | Scope, data models, API boundary, pseudocode | TDD steps, archivos a crear, tests, commits |
| **Nivel** | Arquitectónico | Ejecutable |
| **Quién lo usa** | El que decide | El que implementa |
| **Similar a** | PRD / spec-kit spec.md | BUILD_SPEC / spec-kit tasks.md |

---

## cc.md — Feedback loop Claude → Codex

No es documentación. Es una **cola de tareas viva** entre Claude (reviewer) y Codex (executor):

```
# Action 1: Fix TypeScript imports
- Problem: circular dependency in core/types.ts
- Files: src/core/types.ts:45, src/config/schema.ts:12
- Fix: extract shared interface to src/shared/types.ts
- Verify: `npx tsc --noEmit` passes
- Status: Done (commit e071d7c)
```

Cada action tiene: problema, archivos con líneas, fix propuesto, verificación, status.

**Es lo más parecido que hemos visto a un sistema de tracking que realmente funciona** — no es un checklist genérico, es feedback específico con verificación.

---

## Lo que clawpal hace diferente

### 1. Planes como artefactos históricos, NO documentos vivos

Cuando algo cambia:
```
2026-02-15-recipe-engine-design.md     ← diseño original
2026-02-17-recipe-engine-redesign.md   ← rediseño (nuevo archivo)
```

No editan el original. Crean uno nuevo. El original queda como registro de lo que se pensó.

**THYROX hace lo opuesto:** Editamos SKILL.md, CLAUDE.md, README.md in-place. Perdemos el historial de por qué cambió (excepto en git log, que nadie lee).

### 2. TDD como paso prescrito en el plan

Cada implementation-plan tiene:
```
Step 1: Write the failing test
Step 2: Run it, verify it fails
Step 3: Write minimal implementation
Step 4: Run test, verify it passes
Step 5: Commit
```

El plan no dice "implementa X" — dice "escribe el test que falla primero."

### 3. Versioned checklists con criterios observables

mvp-checklist.md:
```
- [x] History list shows recent records ← observable behavior
- [ ] Four integration modes connected    ← observable behavior
```

No dice "implement history feature" — dice "history list shows recent records." El criterio es lo que el usuario VE, no lo que el developer HACE.

### 4. Prompts como assets versionados

```
prompts/
├── doctor/domain-system.md
├── install/orchestrator-decider.md
└── error-guidance/operation-fallback.md
```

Cada prompt tiene:
- `使用位置` — dónde se usa
- `使用时机` — cuándo se invoca
- Template con `{{variables}}`

Separados del código. Versionados en git. UNA fuente de verdad para instrucciones al AI.

---

## Comparación con los 6 proyectos de referencia

| Aspecto | spec-kit | claude-pipe | mlx-tts | oh-my-claude | conv-temp | clawpal | THYROX |
|---------|----------|-------------|---------|-------------|-----------|---------|--------|
| **Organización de planes** | specs/{feature}/ | 2 docs en raíz | N/A | STV skills | No | 48 docs con fecha | analysis/ suelto |
| **Inmutabilidad** | No | No | No | No | Sí (transcripts) | **Sí** (new file per change) | No (editamos in-place) |
| **Design+Impl pairs** | spec+plan | PRD+BUILD_SPEC | N/A | spec+trace | No | **design+impl-plan** | strategy+tasks |
| **Feedback loop** | No | No | No | Oracle agent | No | **cc.md** (specific) | errors/ (generic) |
| **TDD en plan** | No | No | No | Contract tests RED | No | **Step 1: failing test** | No |
| **Checklists** | spec quality | No | No | Reviewer scoring | No | **Observable behaviors** | EXIT_CONDITIONS |

---

## Lecciones para THYROX

### Adoptar

1. **Planes inmutables con fecha** — No editar analysis files. Si hay cambio, crear nuevo con fecha. La historia se cuenta sola.

2. **Design + Implementation pairs** — Separar "qué y por qué" de "cómo paso a paso". No mezclar en un solo doc de 200 líneas.

3. **Criterios observables en checklists** — "El usuario ve X" en vez de "Implementar X".

### Evaluar

4. **cc.md como feedback loop específico** — Más útil que errors/ genérico. Pero requiere un executor (Codex) separado del reviewer (Claude).

5. **Prompts como assets** — Si THYROX evoluciona a tener prompts para cada fase, deberían ser archivos separados, no texto dentro de SKILL.md.

### Lo que confirma

6. **No se necesitan work-logs narrativos** — clawpal no los tiene. Los 48 planes con fecha SON el registro histórico.

7. **No se necesita un ROADMAP manual** — mvp-checklist.md + planes con fecha cumplen la función.

---

**Última actualización:** 2026-03-28
