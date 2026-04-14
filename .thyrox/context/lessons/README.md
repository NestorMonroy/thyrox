```yml
type: Índice de Lecciones Aprendidas
version: 1.0
created_at: 2026-04-14 20:34:23
updated_at: 2026-04-14 20:40:00
```

# Lecciones Aprendidas — Índice Global

Lecciones con impacto cross-WP promovidas desde `work/*/lessons-learned.md`.
Para lecciones locales de un WP específico, ver el WP directamente.

---

## Índice

| Archivo | Lección | Origen | Categoría | Fecha |
|---------|---------|--------|-----------|-------|
| [script-sin-registrar](script-sin-registrar.md) | Script creado sin registrar en settings.json | FASE 35 | Infraestructura | 2026-04-14 |
| [referencias-abstractas](referencias-abstractas.md) | Bulk-sed en docs de plataforma con paths del proyecto | FASE 35 | Referencias | 2026-04-14 |
| [env-var-sesion-activa](env-var-sesion-activa.md) | `settings.json` env vars no propagan a subagentes de sesión activa | FASE 35 | Configuración | 2026-04-14 |
| [bound-agente-timeout](bound-agente-timeout.md) | Instrucciones de agente sin scope bound causan timeouts | FASE 35 | Agentes | 2026-04-14 |

---

## Categorías

| Categoría | Descripción |
|-----------|-------------|
| Infraestructura | Hooks, scripts, settings, wiring |
| Referencias | Docs de plataforma, paths, arquitectura de referencias |
| Configuración | Variables de entorno, settings.json, timeouts |
| Agentes | Subagentes, prompts, scope, paralelismo |
| Git | Commits, migraciones, historial |
| Metodología | Fases, gates, SKILL, CLAUDE.md |

---

## Cómo Promover una Lección

1. La lección debe haber ocurrido en un WP (está en `work/.../lessons-learned.md`)
2. Debe tener impacto cross-WP: evitaría el mismo error en futuros WPs
3. Crear `L-NNN-descripcion-corta.md` con el template de abajo
4. Agregar al índice de este README
5. Si generó un patrón de solución, crear también en `patterns/`

### Template de Lección

```markdown
---
id: L-NNN
titulo: Una frase que describe el aprendizaje
categoria: [Infraestructura|Referencias|Configuración|Agentes|Git|Metodología]
origen_wp: YYYY-MM-DD-nombre-del-wp
origen_fase: FASE N
fecha: YYYY-MM-DD
---

## Contexto
Qué estábamos haciendo cuando ocurrió.

## Qué Pasó
El evento concreto (bug, error, descubrimiento).

## Causa Raíz
Por qué pasó.

## Solución Aplicada
Cómo se resolvió.

## Clave del Aprendizaje
La regla o principio que se extrae. Una oración.

## Aplicación Futura
Cómo prevenir o aprovechar esto en próximos WPs.

## Referencias
- WP origen
- ADR si aplica
- Patrón derivado si aplica
```
