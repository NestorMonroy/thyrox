```yml
created_at: 2026-04-17 19:30:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Stage 5 — STRATEGY
author: NestorMonroy
status: Aprobado
```

# Strategy — goto-problem-fix (ÉPICA 41)

## Resumen ejecutivo

30 problemas confirmados en 4 clusters (A: 6 bugs de scripts, B: 11 ítems README,
C: ✅ ya resuelto, D: 4 docs faltantes). Causa raíz única: **migración parcial**.
Estrategia: fixes quirúrgicos en orden de dependencia, sin refactoring, sin abstracciones nuevas.

---

## Decisiones de solución

### DS-01: Orden de ejecución — dependencias primero

```
Batch 1 → Batch 2 → Batch 3 → Batch 4 → Batch 5
Scripts   Docs     README   ARCH.md   Guides
```

**Rationale:** Los scripts son la causa raíz del GO-TO problem. La documentación
(Batch 2) describe el comportamiento que los scripts implementarán. README y guías
(Batches 3-5) dependen del estado final correcto de scripts y docs.

### DS-02: Bash pura para A-5 (body cleanup de `# Contexto`)

```bash
# Patrón canónico — bash puro, sin python3
CONTEXT_LINE=$(grep -n "^# Contexto" "$NOW_FILE" | head -1 | cut -d: -f1)
if [ -n "$CONTEXT_LINE" ]; then
    head -n $((CONTEXT_LINE - 1)) "$NOW_FILE" > "${NOW_FILE}.tmp"
    printf "\n# Contexto\n\nSin work package activo.\n" >> "${NOW_FILE}.tmp"
    mv "${NOW_FILE}.tmp" "$NOW_FILE"
fi
```

**Rationale:** `analysis.md` línea 121 establece "bash pura, sin python3 como dependencia".
Python3 como primario viola esta restricción (GAP-03 del deep-review Stage 1→3).

### DS-03: `sed -i'' -e` para compatibilidad macOS/Linux

Todos los fixes de close-wp.sh y session-resume.sh usan `sed -i'' -e` en lugar de `sed -i -e`.

**Rationale:** `sed -i -e` falla en BSD sed (macOS). `sed -i'' -e` funciona en ambos
GNU sed (Linux) y BSD sed (macOS). Impacto: GAP-04 resuelto sin costo adicional.

### DS-04: Compresión de comentarios en session-start.sh (GAP-02)

```
Antes de A-1:  129 líneas
Después de A-1: 126 líneas (eliminación de fallback 61-63)
Objetivo:       ≤ 120 líneas
Déficit:        6 líneas a eliminar de bloques de comentarios

Líneas a comprimir:
  L9-12 (4 líneas) → 1 línea: saves 3
  L37   (1 línea separator) → delete: saves 1
  L40-41 (2 líneas) → delete (fusionar con L39): saves 2
  Total: 6 líneas → resultado: 120 líneas exactas
```

**Rationale:** Restricción documentada en `analysis.md`. El script no puede crecer
más allá de 120 líneas para mantener legibilidad como hook inline.

### DS-05: Scope completo en ÉPICA 41

D-2 (methodology-selection-guide) y D-3 (coordinator-integration guide) están IN-SCOPE.
El índice de referencias y agents (GAP-06) se declara ÉPICA 42.

**Rationale:** Usuario confirmó explícitamente "hacemos todo en ÉPICA 41" (GAP-05 resuelto).
GAP-06 no es parte de los 30 problemas originales — es una mejora identificada durante diagnose.

---

## 5 Batches de ejecución

| Batch | Archivos | Bugs/Items | Bloqueante de |
|-------|---------|------------|---------------|
| 1 | `close-wp.sh`, `session-start.sh`, `session-resume.sh` | A-1..A-6, GAP-02 | Batch 2 |
| 2 | `state-management.md`, docs methodology_step | D-1, D-4 | Batch 5 |
| 3 | `README.md` | B-1..B-9 | — |
| 4 | `ARCHITECTURE.md` | B-10 | — |
| 5 | `DECISIONS.md`, guides | B-11, D-2, D-3 | — |

Batches 3, 4, 5 son independientes entre sí — pueden ejecutarse en paralelo.
Batch 2 puede ejecutarse en paralelo con Batches 3 y 4.
Batch 1 debe completarse antes de todos los demás.

---

## Restricciones técnicas confirmadas

| Restricción | Fuente | Impacto |
|-------------|--------|---------|
| `session-start.sh` ≤ 120 líneas | `analysis.md` L121 | DS-04 necesario |
| Bash pura en close-wp.sh | `analysis.md` L121 | DS-02 canónico |
| `sed -i'' -e` en todos los sed | GAP-04 deep-review | DS-03 |
| Un Edit por archivo | CLAUDE.md | Batch 1: 1 Edit por script |

---

## Riesgos residuales

| Riesgo | Mitigación |
|--------|------------|
| R-001: session-start.sh rompe hook si sintaxis incorrecta | Test manual post-fix: `bash -n session-start.sh` |
| R-002: BSD sed en macOS | DS-03 resuelve |
| R-005: Límite 120 líneas | DS-04 resuelve exactamente a 120 |
| Stale body en now.md con múltiples `# Contexto` headings | grep -n busca la primera ocurrencia — seguro |
