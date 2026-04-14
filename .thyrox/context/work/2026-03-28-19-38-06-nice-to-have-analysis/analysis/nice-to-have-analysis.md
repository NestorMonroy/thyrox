```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
```

# Análisis: 8 Nice-to-Have Items

## Veredicto

| # | Item | Decisión | Esfuerzo | Valor | Razón |
|---|------|----------|----------|-------|-------|
| NH-1 | Template Selection Guide | **SKIP** | Bajo | Ninguno | Ya existe en `references-templates-mapping.md` (217 líneas con tabla completa) |
| NH-2 | ROADMAP Metrics Automation | **SKIP** | Medio | Bajo | ROADMAP es free-form markdown — parsing frágil, script quebradizo |
| NH-3 | README.md Diagrama desactualizado | **DO IT** | ~10 min | Alto | Falta work/, errors/, focus.md, now.md — primera impresión del usuario |
| NH-4 | CONTRIBUTING.md Error Tracking | **DO IT** | ~10 min | Medio | 0 menciones de error tracking en guía de contribución |
| NH-5 | Timestamp Validation | **SKIP** | Bajo | Bajo | Problema histórico (ERR-025), auto-corregido con `date` |
| NH-6 | GitHub Actions Additions | **SKIP** | Medio-Alto | Negativo | Overengineering — false positives en proyecto template |
| NH-7 | TOC Generation Script | **SKIP** | Medio | Bajo | 7/10 archivos ya tienen TOC, 3 restantes cerca del umbral |
| NH-8 | Template Versioning | **SKIP** | Bajo | Ninguno | Sin mecanismo de update — versiones decorativas |

## Análisis detallado por item

### NH-1: Template Selection Guide → SKIP

**Evidencia:** El archivo `context/work/2026-03-28-10-50-40-references-templates-analysis/analysis/references-templates-mapping.md` ya tiene 217 líneas con tabla completa de los 32 templates y 20 references mapeados a fases, con "When to use" y "How to use". El SKILL.md ya tiene "References por dominio" agrupado por fase (líneas 172-197).

**Riesgo de hacerlo:** Crear un segundo documento con el mismo contenido introduce un problema de covariancia — dos fuentes que mantener sincronizadas cuando se agregan/eliminan templates.

### NH-2: ROADMAP Metrics Automation → SKIP

**Evidencia:** ROADMAP.md es free-form markdown con sub-headers, notas inline, y agrupaciones arbitrarias. Un script `grep -c '\[x\]'` da un conteo rápido pero no entiende la estructura de fases. Un script robusto necesitaría parsear secciones, manejar items anidados, e ignorar ejemplos en bloques de código.

**Setup-template.sh resetea ROADMAP** para nuevos usuarios — empiezan con estructura simple donde eyeballing es suficiente.

### NH-3: README.md Diagrama → DO IT

**Evidencia:** README.md muestra:
```
.claude/
│   ├── context/
│   │   ├── project-state.md
│   │   └── decisions.md
```

Realidad: `context/` contiene `project-state.md`, `decisions.md`, `decisions/`, `errors/`, `focus.md`, `now.md`, `work/` (19 subdirectorios). Faltan 4 directorios/archivos activos.

CLAUDE.md tiene el diagrama más preciso (incluye focus.md, now.md, decisions/, work/) pero le falta errors/. README.md es Level 3 (presentación) — debe ser exacto.

### NH-4: CONTRIBUTING.md Error Tracking → DO IT

**Evidencia:** `grep -i "error" CONTRIBUTING.md` = 0 resultados. Sin embargo, `conventions.md` líneas 464-475 tiene sección "Error Tracking (AP-06)" completa con campos, reglas y feedback loop. Hay 16 ERR documentados y un `error-report.md.template`.

**Acción:** Agregar 3-5 líneas en CONTRIBUTING.md como puntero a conventions.md, no duplicar contenido.

### NH-5: Timestamp Validation → SKIP

**Evidencia:** 19 work packages existentes con formatos inconsistentes:
- `2026-03-27-010621-` (HHMMSS sin separadores)
- `2026-03-28-10-50-40-` (HH-MM-SS con separadores)
- `2026-03-28-060000-` (timestamp inventado redondo)

ERR-025 ya documenta esto. La prevención es usar `date +%Y-%m-%d-%H-%M-%S` al crear (convención, no validación). Un script de validación flaggearía los 19 existentes sin poder renombrarlos (rompería git history).

### NH-6: GitHub Actions Additions → SKIP

**Evidencia:** Checks propuestos:
- "¿Se actualizó ROADMAP.md?" → No todo PR necesita actualizar ROADMAP. False positives.
- "¿ERR sigue convención de naming?" → 16 errores, todos correctos. Check innecesario.
- "¿Commit referencia work package ID?" → El proyecto no requiere esto actualmente. Hostil para contribuidores.

Los checks actuales (skill integrity, size <500, frontmatter, conventional commits) cubren los invariantes importantes.

### NH-7: TOC Generation → SKIP

**Evidencia:** 7/10 archivos >300 líneas ya tienen TOC (sesión 2). Los 3 restantes están cerca del umbral (318, 328, 428 líneas). Agregar TOC manualmente a 3 archivos = 15 min. Crear script = 1+ hora. Los archivos raramente cambian una vez escritos.

### NH-8: Template Versioning → SKIP

**Evidencia:** 8/33 templates ya tienen `Versión:`. 23 tienen frontmatter sin versión. 2 no tienen frontmatter. Pero sin mecanismo de update/migración, una versión es decorativa. El campo `Fecha actualización:` (presente en muchos) es más útil en la práctica.

## Conclusión

**2 de 8 vale la pena hacer.** Ambos son ~10 minutos cada uno. Los otros 6 caen en:
- Ya resuelto de otra forma (NH-1, NH-5)
- Overengineering para un proyecto template (NH-2, NH-6, NH-7)
- Decorativo sin impacto real (NH-8)
