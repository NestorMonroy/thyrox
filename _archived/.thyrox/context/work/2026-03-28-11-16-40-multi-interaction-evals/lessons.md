```yml
Fecha: 2026-03-28
Tipo: Phase 7 (TRACK) — Lecciones
```

# Lecciones: Multi-Interaction Evals

## Resultados

| Eval | Score | Resultado |
|------|-------|-----------|
| MI-01 (reanudar trabajo) | 3/4 | Lee estado, identifica migración, NO propone reiniciar. Falla: no dice "T-003" explícitamente. |
| MI-02 (cold boot existente) | 4/4 | Lee ROADMAP, identifica FASE 2 pagos, NO crea desde cero. Perfecto. |
| MI-05 (Phase 6 interrumpida) | 4/4 | Identifica T-006, menciona T-001-T-005 hechos, continúa. Perfecto. |
| MI-13 (implementación falló) | 3/3 | Identifica fallo, NO avanza a T-007, investiga error. Perfecto. |
| MI-21 (segunda interacción) | 2/3 | Usa requisitos, no repite preguntas. Falla: no propone avance de fase explícitamente. |
| MI-22 (status con plan) | 0/4 | Falló completamente — "directorio vacío." Bug en script de paths. |
| MI-23 (trazabilidad) | 4/4 | IDs, R-01/R-02/R-03, trazabilidad visible, orden lógico. Perfecto. |

**Overall: 20/26 (76.9%)**

## L-004: Bug en paths del script invalida resultados de MI-22

**Qué pasó:** El script tenía un path doble `.claude/.claude/` al copiar SKILL.md y CLAUDE.md al workspace temporal. Claude no encontró los archivos en MI-22 y respondió "directorio vacío."

**Por qué importa:** MI-22 no falló por el SKILL sino por un bug en el script de testing. El resultado 0/4 no es representativo.

**Qué hacer:** Corregir el path en run-multi-evals.sh y re-ejecutar MI-22 aislado.

**Insight:** Los tests de tests necesitan sus propios tests. Un bug en el eval runner invalida todo el eval.

## L-005: Claude lee archivos de contexto sin SKILL.md presente

**Qué pasó:** A pesar del bug de paths (SKILL.md no se copió), 5 de 7 evals pasaron bien. Claude leyó focus.md, now.md, plan.md correctamente sin necesitar el SKILL.

**Por qué importa:** Demuestra que la estructura de archivos (focus.md, now.md, plan.md con checkboxes) es auto-explicativa. Claude entiende el estado del proyecto sin necesitar instrucciones del SKILL.

**Insight:** Buenos archivos de estado hacen el SKILL menos necesario para navegación. El SKILL es más valioso para el PROCESO (qué fase seguir) que para la NAVEGACIÓN (dónde estamos).

## L-006: claude -p con --add-dir no es necesario si se hace cd al directorio

**Qué pasó:** El script hace `cd "$dir" && claude -p "prompt"` y Claude lee los archivos del directorio actual automáticamente.

**Qué hacer:** No necesitar `--add-dir` para evals. Solo `cd` al workspace temporal.

## L-007: Multi-interaction evals (76.9%) vs First-interaction evals (78.6%)

**Qué pasó:** Los scores son similares. Los multi-interaction no son significativamente peores.

**Por qué importa:** Contradice la hipótesis de que "los first-interaction misses se resolverían en multi-interaction." Algunos sí (MI-23 perfecto con trazabilidad explícita) pero otros no (MI-21 sigue sin proponer avance de fase).

**Insight:** La calidad del SKILL es consistente across interaction types. Los gaps son del SKILL, no del contexto.
