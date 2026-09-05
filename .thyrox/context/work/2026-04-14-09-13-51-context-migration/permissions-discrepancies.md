```yml
type: Deep-Review Artifact
created_at: 2026-04-14 16:46:09
source: claude-howto (v2.3.0) + empirical testing + project files
topic: discrepancias críticas en el modelo de permisos documentado de THYROX
fase: FASE 35
```

# permissions-discrepancies.md

Dos discrepancias críticas identificadas durante la investigación de FASE 35
(context-migration). Fuente: deep-review de `/tmp/reference/claude-howto/` +
tests empíricos + análisis de archivos del proyecto.

---

## Discrepancia 3.1 — Claim sin respaldo documental en `permission-model.md`

### Afirmación actual

`permission-model.md:167-168`:

> ".claude/skills/ es EXEMPT — Claude puede editar SKILL.md sin prompt en ese modo.
> No usar en entornos de producción por este motivo."

### Problema

Ninguno de los 47+ archivos del repositorio `claude-howto` menciona esta exención.
El deep-review exhaustivo (Modo 2, exploración sin sesgo) no encontró evidencia de
que `.claude/skills/` tenga tratamiento especial documentado.

### Origen probable

Conocimiento empírico no documentado: el comportamiento observado fue que editar
`.claude/agents/` y `.claude/skills/` era automático (sin prompt), mientras que
`.claude/context/` y otros subdirectorios siempre prompts. Alguien escribió esa
observación como si fuera una regla oficial.

### Hipótesis alternativa

La selectividad puede deberse a:
1. La safety invariant protege `.claude/` en su totalidad bajo `bypassPermissions`
2. La selección de qué paths están protegidos es interna al binario y no está
   documentada públicamente
3. El comportamiento puede cambiar entre versiones de Claude Code sin aviso

### Estado del claim

**Indocumentado** — no tiene respaldo en ninguna fuente oficial conocida.

### Acción recomendada

Corregir `permission-model.md:167-168`: eliminar la afirmación de EXEMPT y
reemplazar por descripción del comportamiento observado con nota de "no documentado".

---

## Discrepancia 3.2 — `defaultMode` en posición incorrecta en `settings.json`

### Estado actual

```json
{
  "defaultMode": "acceptEdits",
  "env": { ... },
  "permissions": {
    "allow": [...],
    "ask": [...],
    "deny": [...]
  }
}
```

`defaultMode` está en la **raíz** del JSON.

### Formato canónico (claude-howto)

`03-skills/README.md`, `STYLE_GUIDE.md` y todos los ejemplos del repositorio:

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [...],
    "ask": [...],
    "deny": [...]
  }
}
```

`defaultMode` debe estar **dentro** del objeto `permissions`.

### Implicación

Claude Code puede aceptar ambas ubicaciones (root-level puede ser un fallback),
pero **sin garantía documentada**. El comportamiento actual puede ser correcto
por compatibilidad histórica, no por especificación. En versiones futuras, la
ubicación root-level puede dejar de funcionar.

### Evidencia de impacto

Los tests mostraron que `defaultMode: acceptEdits` funcionaba parcialmente:
archivos fuera de `.claude/` (ej: `CHANGELOG.md`) eran automáticos, pero los
archivos en `.claude/context/` siempre prompts. La causa real era la safety
invariant del binario — pero la posición incorrecta de `defaultMode` añade
incertidumbre a cualquier diagnóstico.

### Acción recomendada

Mover `defaultMode` dentro del objeto `permissions` en `.claude/settings.json`.

---

## Relación entre ambas discrepancias

Las dos discrepancias contribuyeron a la confusión durante la investigación:

1. **D3.1** → Si `.claude/skills/` es automático por razones no documentadas,
   ¿cuál es exactamente el criterio de protección? La observación es real pero
   la regla escrita era incorrecta.

2. **D3.2** → Si `defaultMode` está mal ubicado, ¿los allow rules de
   `.claude/context/` están activos? La posición puede afectar si las reglas
   se interpretan correctamente.

**Conclusión:** La safety invariant es el factor determinante. Los allow rules
para `.claude/context/` son inefectivos independientemente de la posición de
`defaultMode`.

---

## Fixes pendientes

| # | Archivo | Cambio | Prioridad |
|---|---------|--------|-----------|
| F1 | `.claude/references/permission-model.md:167-168` | Corregir claim EXEMPT por observación empírica sin respaldo | Alta |
| F2 | `.claude/settings.json` | Mover `defaultMode` dentro de `permissions` | Alta |
| F3 | `.claude/settings.json` | Eliminar allow rules inefectivos para `.claude/context/` | Media |
