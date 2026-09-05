```yml
created_at: 2026-04-17 19:20:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — DIAGNOSE
author: deep-review agent
status: Completado
veredicto: GO CONDICIONAL — 3 condiciones resueltas antes de Stage 10
```

# Deep-Review: Cobertura Stage 1 → Stage 3 (goto-problem-fix)

**Veredicto: GO CONDICIONAL**

---

## Gaps bloqueantes (resueltos antes de Stage 5/10)

### GAP-02 — session-start.sh sigue en 126 líneas tras fix A-1 (límite: 120)
- Fix A-1 elimina 3 líneas (129→126). Quedan 6 líneas de exceso.
- Resolución: comprimir bloques de comentarios (ver análisis abajo).

### GAP-03 — Python3 como solución primaria en A-5 viola restricción bash puro
- `analysis.md` línea 121: "bash pura, sin python3 como dependencia"
- El diagnose pone python3 como primaria y bash como secundaria — invertido.
- Resolución: bash pura es la solución canónica para A-5.

### GAP-05 — Scope de D-2 y D-3 no confirmado
- SP-02 requería decisión antes de Stage 3. No ocurrió en el diagnose.
- Resolución: usuario confirmó "hacemos todo en ÉPICA 41" → D-2 y D-3 dentro de scope.

---

## Gaps no bloqueantes

### GAP-01 — "30 problemas" no establecido en Stage 1
- Stage 1 tiene 21 ítems explícitos (11+6+4). El diagnose llega a 30 por granularidad adicional.
- Acción: task plan establece el inventario canónico con IDs trazables.

### GAP-04 — BSD sed (macOS) no cubierto en A-4/A-5
- `sed -i -e` funciona en GNU sed (Linux). En macOS BSD sed requiere `sed -i '' -e`.
- Acción: usar `sed -i'' -e` (forma compatible con ambos) en todos los fixes.

### GAP-06 — Índice de referencias y agents no tiene fix
- B-11 cubre solo ADRs (DECISIONS.md). Referencias (47) y agents (23) sin índice.
- Acción: declarar explícitamente ÉPICA 42.

### GAP-07 — Criterio "README funcional" cubre solo reemplazo, no error documentado
- `analysis.md` línea 158: "bash setup-template.sh → error documentado + alternativa"
- Acción: agregar nota en README sobre migración de `setup-template.sh`.

---

## Cobertura completa — 20 ítems correctamente cubiertos

1. A-1: Fallback session-start.sh — fix exacto ✅
2. A-2: phase→stage en session-resume.sh — fix exacto ✅
3. A-3: Fallback duplicado session-resume.sh — fix exacto ✅
4. A-4: sed pattern close-wp.sh — fix exacto con flow/methodology_step ✅
5. A-5: Body de now.md — dos alternativas (bash pura = canónica) ✅
6. A-6: update-state.sh en close-wp.sh — fix exacto ✅
7. B-1/3/5: Metadata README ✅
8. B-2: Quick Start / setup-template.sh ✅
9. B-6: Árbol de directorios ✅
10. B-7: Sección Metodología ✅
11. B-4: Comandos obsoletos ✅
12. B-8: Sección Coordinators NUEVA ✅
13. B-9: Versión y fecha ✅
14. B-10: ARCHITECTURE.md ✅
15. B-11: DECISIONS.md (ADRs) ✅
16. D-1: state-management.md body ✅
17. D-4: methodology_step docs ✅
18. Causa raíz sistémica documentada ✅
19. Dependencias entre fixes ✅
20. Orden de ejecución 5 batches ✅
