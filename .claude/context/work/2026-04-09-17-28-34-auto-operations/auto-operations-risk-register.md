```yml
type: Risk Register
work_package: 2026-04-09-17-28-34-auto-operations
fase: FASE 28
created_at: 2026-04-09 18:15:00
```

# Risk Register — auto-operations

## R-01: [OBSOLETO — solucion descartada en Phase 2]

```
Estado: obsoleto — create-wp.sh fue descartado en Phase 2 (D-04 adopta close-wp.sh)
```

El riesgo original aplica a create-wp.sh, que ya no es parte de la solucion.
La solucion adoptada usa PostToolUse hooks reactivos, no scripts imperativos.

---

## R-02: [OBSOLETO — solucion descartada en Phase 2]

```
Estado: obsoleto — create-wp.sh fue descartado en Phase 2
```

El riesgo original aplica a create-wp.sh, que ya no es parte de la solucion.

---

## R-03: Conflicto close-wp.sh vs PostToolUse hook en Phase 7

```
Probabilidad: baja (flujo normal no genera conflicto)
Impacto: medio
Severidad: baja
```

Si `close-wp.sh` setea `current_work: null` y luego Claude escribe otro archivo WP,
el PostToolUse hook volveria a setear `current_work` al WP. El conflicto se anula.

**Analisis:** En el flujo normal de Phase 7, `close-wp.sh` se llama AL FINAL, despues
del ultimo Write al WP. El hook solo actua cuando detecta CAMBIO de WP. Si no hay mas
Writes, no hay mas disparo. El conflicto es teorico, no real en el flujo normal.

**Mitigacion:** Instruccion explicita en workflow-track/SKILL.md: llamar close-wp.sh
DESPUES de todos los Writes del WP (lessons-learned, final-report).

---

## R-04: jq como dependencia no declarada en sync-wp-state.sh

```
Probabilidad: baja (jq disponible en /usr/bin/jq en este entorno)
Impacto: alto (si falla, current_work no se sincroniza)
Severidad: media
```

`sync-wp-state.sh` usa `jq` para parsear el JSON de stdin del PostToolUse hook.
Si el entorno no tiene jq, el script falla silenciosamente.

**Mitigacion:** Agregar fallback a python3 en el script:

```bash
FILE_PATH=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || \
            python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))")
```

O documentar jq como prerequisito en scripts/README.

---

## R-05: Campo `if` en PostToolUse puede no filtrar paths profundos

```
Probabilidad: media (comportamiento de * con separadores no verificado)
Impacto: bajo (solo performance, no funcional)
Severidad: baja
```

El campo `if: "Write(/.claude/context/work/*)"` puede no filtrar correctamente
si `*` no atraviesa separadores de directorio en paths profundos.

**Mitigacion:** El script `sync-wp-state.sh` tiene filtro interno como fallback.
Si el `if` no filtra, el script verifica y sale con exit 0 rapidamente.
Sin impacto funcional — solo el script se lanza innecesariamente en otros Writes.
