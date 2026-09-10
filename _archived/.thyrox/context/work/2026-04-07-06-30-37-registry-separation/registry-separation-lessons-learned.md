```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-06-30-37-registry-separation
created_at: 2026-04-07 06:30:37
status: Completado
```

# Lecciones Aprendidas: registry-separation

## L-057 — La referencia externa cambió el scope antes de ejecutar

**Contexto:** Scope inicial proponía solo READMEs internos + `docs/registry.md`. El análisis de mise (referencia externa) añadió el lenguaje datos/comportamiento y el documento de decisión arquitectónica en `docs/architecture/`.

**Lección:** Esperar la referencia antes de aprobar scope fue la decisión correcta. El usuario lo anticipó: "el scope puede cambiar". El análisis de mise tomó ~7 min y enriqueció todos los documentos con lenguaje preciso.

**Prevención (positiva):** En WPs de documentación arquitectónica, buscar referencias externas en Phase 1 antes de proponer scope.

---

## L-058 — Separación física ya existente ≠ separación documentada

**Contexto:** `agents/`, `backend/frontend/db/`, `mcp/` ya estaban físicamente separados desde FASE 15. El problema era que ningún documento explicaba por qué ni cuál era la diferencia semántica.

**Lección:** La estructura de directorios comunica intención, pero solo si está acompañada de documentación. Un README que describe los tres flujos convierte la estructura en lenguaje.

**Prevención:** En cualquier WP que crea estructura nueva, crear el README del directorio en la misma tarea, no en un WP posterior.

---

## L-059 — `docs/` tiene dos audiencias distintas a `.claude/`

**Contexto:** Al crear `docs/registry.md` vs `.claude/registry/README.md` quedó claro que son documentos para audiencias distintas:
- `.claude/registry/README.md` — contributor que trabaja con THYROX en ese proyecto
- `docs/registry.md` — developer que evalúa o adopta THYROX como framework

**Lección:** No duplicar contenido entre los dos — `docs/` referencia a `.claude/` para detalles operacionales, pero no los reproduce.

---

## L-060 — mise como referencia de diseño: principio datos/comportamiento

**Contexto:** mise separa datos (registry TOML) de comportamiento (backends Rust). El mismo principio mapea a THYROX: templates = datos, agents = comportamiento, MCP = runtime.

**Lección:** Tener lenguaje preciso para la separación hace que la arquitectura sea explicable en una oración. Antes de este WP, la distinción existía pero no tenía nombre.

**Aplicación futura:** El mismo análisis de mise sugiere `skill.toml` + JSON Schema + `thyrox doctor` para FASE 16.
