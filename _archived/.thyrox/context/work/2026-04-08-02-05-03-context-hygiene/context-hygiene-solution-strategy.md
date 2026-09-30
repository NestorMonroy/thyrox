```yml
type: Estrategia de Solución
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: En progreso
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy: context-hygiene

## Key Ideas

### Idea 1 — Phase 7 como responsable único de la sincronización de estado
El motor de persistencia del framework son los archivos. Si Phase 7 no los actualiza, el estado queda congelado. La solución no es parchear los archivos individualmente — es hacer que Phase 7 los actualice siempre, como parte del cierre de cualquier WP.

### Idea 2 — Actualización inmediata + regla para el futuro
El problema tiene dos dimensiones: el estado actual (congelado en FASE 15) y el mecanismo roto (Phase 7 no actualiza). Hay que resolver ambos: actualizar los archivos ahora Y añadir la instrucción en Phase 7 para que no vuelva a ocurrir.

### Idea 3 — Nomenclatura FASE vs Phase: aclarar con glosario, no renombrar
Renombrar "FASE" a "WP-N" en el ROADMAP requeriría migrar 19 entradas y es riesgo de confusión en el historial. La solución más liviana es un glosario explícito en CLAUDE.md y SKILL.md que declara la distinción.

---

## Research

### Unknown 1 — ¿Qué debe contener cada archivo de estado?

**Análisis del estado ideal:**

**`focus.md`** — responde: ¿en qué estamos trabajando ahora y qué se completó recientemente?
- Debe mencionar: última FASE completada, WP activo (si lo hay), próximos pasos inmediatos
- Actualizar: al completar cada FASE (Phase 7)

**`now.md`** — responde: ¿cuál es el estado de esta sesión?
- Debe mencionar: WP activo (nombre + timestamp), Phase actual, blockers
- Actualizar: al iniciar y cerrar cada sesión (Phase 7 al cerrar, inicio de sesión al abrir)

**`project-state.md`** — responde: ¿qué hay en el framework hoy?
- Debe mencionar: versión, agentes activos (con count real), FASEs completadas, últimas adiciones
- Actualizar: al completar cada FASE (Phase 7)

**Alternativas evaluadas:**

| Opción | Pros | Contras |
|--------|------|---------|
| A: Actualizar los 3 en Phase 7 siempre | Consistencia garantizada | Overhead leve en WPs pequeños |
| B: Solo actualizar `focus.md` + `now.md`; `project-state.md` bajo demanda | Menor overhead | project-state.md sigue desactualizándose |
| C: Fusionar los 3 en un solo archivo `state.md` | Menos archivos | Rompe compatibilidad con scripts y hooks actuales |

**Decisión:** Opción A — actualizar los 3 en Phase 7. El overhead es mínimo (3 ediciones al final del WP) y la garantía de consistencia justifica el costo.

---

### Unknown 2 — ¿Dónde en Phase 7 añadir la instrucción de actualización?

**Alternativas:**

| Opción | Pros | Contras |
|--------|------|---------|
| A: Al inicio de Phase 7 (antes de lecciones) | Los archivos se actualizan aunque Phase 7 se interrumpa | Puede parecer fuera de lugar antes de las lecciones |
| B: Al final de Phase 7 (después de CHANGELOG) | Flujo natural: documenta → actualiza estado | Si Phase 7 se interrumpe antes del final, no se actualizan |
| C: Como checklist final de Phase 7 (junto a validate-session-close.sh) | Junto a las validaciones existentes | Podría perderse entre otros ítems |

**Decisión:** Opción C — como parte del checklist final de Phase 7, explícito y ordenado:
```
Al cerrar Phase 7:
1. Lecciones aprendidas
2. CHANGELOG
3. Actualizar focus.md + now.md + project-state.md ← NUEVO
4. validate-session-close.sh
```

---

### Unknown 3 — ¿Cómo resolver la colisión FASE vs Phase?

**Alternativas:**

| Opción | Pros | Contras |
|--------|------|---------|
| A: Renombrar FASE → WP-N en ROADMAP | Elimina la ambigüedad | 19 entradas a migrar, historial confuso |
| B: Añadir glosario en CLAUDE.md y SKILL.md | Sin migración, aclaración inmediata | No elimina el término FASE, solo lo explica |
| C: Renombrar en documentos nuevos, dejar legacy como está | Gradual | Dos nomenclaturas coexisten más tiempo |

**Decisión:** Opción B — glosario explícito. La distinción es conceptual, no técnica. Un glosario en CLAUDE.md (leído siempre) y una nota en SKILL.md (consultado en sesión) resuelve la confusión sin migración.

---

## Fundamental Decisions

| ID | Decisión | Alternativas descartadas | Justificación |
|----|----------|--------------------------|---------------|
| D-01 | Actualizar focus.md + now.md + project-state.md en Phase 7, siempre | Solo focus+now / fusionar en state.md | Consistencia sin romper compatibilidad |
| D-02 | Instrucción en Phase 7 como checklist final (junto a validate-session-close.sh) | Inicio de Phase 7 / final de Phase 7 | Agrupa con las validaciones existentes |
| D-03 | Glosario FASE vs Phase en CLAUDE.md + SKILL.md, sin renombrar | Renombrar en ROADMAP / nomenclatura gradual | Sin migración, aclaración inmediata |
| D-04 | Actualización inmediata de los 3 archivos congelados (ahora, en Phase 6) | Solo corregir la regla / retroactive automático | El problema afecta cada sesión — no puede esperar a Phase 7 teórica |

---

## Cambios concretos

### En SKILL.md Phase 7 (checklist final)
```
REQUERIDO al cerrar WP:
- Actualizar focus.md: mencionar FASE completada, WP cerrado, próximo paso
- Actualizar now.md: WP → null, phase → null, last_session → hoy
- Actualizar project-state.md: versión, agentes activos, FASE completada
```

### En CLAUDE.md (glosario)
```
## Glosario de términos
- FASE N: work package del proyecto, número secuencial (ROADMAP)
- Phase N: fase SDLC dentro de cada WP, 1-7 (SKILL.md)
  Ejemplo: "Estamos en Phase 4 del WP que corresponde a FASE 19"
```

### Actualización inmediata
- `focus.md`: FASE 19 completada, WP context-hygiene activo
- `now.md`: WP context-hygiene, Phase 2 — SOLUTION_STRATEGY
- `project-state.md`: 9 agentes, FASEs 1-19, versión 1.6.0

---

## Validación

- [x] Key ideas identificadas (3)
- [x] Unknowns investigados con alternativas (3)
- [x] Decisiones fundamentales documentadas (4)
- [x] Cambios concretos definidos por archivo
- [x] Sin contradicción con decisiones anteriores
- [x] WP `documentation` — solo modifica archivos de contexto y SKILL.md
