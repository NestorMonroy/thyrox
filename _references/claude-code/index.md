# Documentación oficial de Claude Code — copia local versionada

Creado: 2026-08-07T18:15:19
Origen: directiva del ejecutor 2026-08-07 — *"¿no consideras que es mejor que
tengas los archivos … para que no gastes tantos tokens usando WebFetch? Ese fue
el motivo por el cual tienes el repositorio de `odoo-tools`"*.

## Por qué existe

Los documentos llegaban por **upload de sesión**, a
`/root/.claude/uploads/<session-id>/<hash>-<nombre>.md`. Ese directorio es
**de sesión** y sus nombres son hashes: la sesión siguiente no los encuentra, y
la alternativa era volver a pagar `WebFetch` contra `code.claude.com` por cada
consulta.

Es la **misma forma** que ya nos costó una vez con la referencia de Odoo: el
árbol vivía en un scratchpad temporal, se perdió, y por eso se movió al
repositorio `odoo-tools`
(`referencia-odoo-gobierna-las-decisiones.md`, sección del árbol restaurado).
Esta copia aplica la misma decisión al otro cuerpo de referencia.

## Coste: cero tokens de piso

`.claude/references/` es **on-demand** — no se carga en cada sesión, a
diferencia de `.claude/rules/` (I-009). Añadir 708 KB aquí **no toca** el piso
de contexto de 126 283 tokens que [H-DOCS-104](../../../source/gestion/pm/docs/iniciativas/evaluar-agent-sdk-orquestacion/hallazgos/hallazgo-H-DOCS-104-el-piso-de-contexto-lo-ponemos-nosotros.rst) midió. Se lee con `Read` o
`grep` sólo cuando hace falta.

## Cómo se cita — alias `ccdoc:`

Mismo criterio que los alias `odoo19c:`/`odoo18c:` de la referencia Odoo: la
cita nombra el documento y la línea, no la ruta larga.

```
ccdoc: memory.md:206          →  .claude/references/claude-code/memory.md:206
ccdoc: sub-agents.md:...      →  .claude/references/claude-code/sub-agents.md
```

## Qué hay (17 archivos, 708 KB, capturados 2026-08-06/07)

| Archivo | Qué gobierna |
|---|---|
| `llms.txt` | índice de toda la documentación — **empezar aquí** para saber qué pedir |
| `memory.md` | CLAUDE.md, `.claude/rules/`, **`paths:`**, auto memory, `/memory` |
| `context-window.md` | qué se carga al arrancar, **qué sobrevive a la compactación**, `/context`, `/compact`, `/autocompact` |
| `sub-agents.md` | qué hereda un subagente, frontmatter, qué omiten `Explore`/`Plan` |
| `hooks.md` · `hooks-guide.md` | eventos, tipos (`command`/`prompt`/`agent`/`http`), payloads |
| `tools-reference.md` | contrato de cada herramienta |
| `permissions.md` | modos de permiso, allow/deny |
| `best-practices.md` · `claude-code-features.md` · `overview.md` | uso general |
| `mcp.md` · `custom-tools.md` · `structured-outputs.md` | SDK y herramientas propias |
| `modifying-system-prompts.md` · `prompt-library.md` | prompt del sistema y ejemplos |
| `cost-tracking.md` | medición de consumo |

## Frescura

Son **capturas fechadas**, no un espejo vivo. La documentación oficial cambia
(varias secciones citan versiones concretas: `v2.1.198`, `v2.1.211`,
`v2.1.217`). Todo análisis que las cite **anota la fecha de captura**, igual que
un análisis de la referencia Odoo anota el commit de `odoo-tools`.

`WebFetch` sigue siendo válido para **lo que no está aquí** o cuando se sospecha
que una sección cambió — no como primera opción para lo que ya está en disco.
