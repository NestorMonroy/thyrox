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
Estado: NO MATERIALIZADO — riesgo teórico confirmado como inofensivo
```

Si `close-wp.sh` setea `current_work: null` y luego Claude escribe otro archivo WP,
el PostToolUse hook volveria a setear `current_work` al WP. El conflicto se anula.

**Resultado real:** El flujo de Phase 7 ejecutó todos los Writes ANTES de llamar
close-wp.sh. El conflicto no se materializó. El flujo natural de Phase 7 (lessons-learned →
risk-register → CHANGELOG → close-wp.sh al final) previene el conflicto de forma natural.

---

## R-04: jq como dependencia no declarada en sync-wp-state.sh

```
Probabilidad: baja (jq disponible en /usr/bin/jq en este entorno)
Impacto: alto (si falla, current_work no se sincroniza)
Severidad: media
Estado: MITIGADO — fallback python3 implementado en el script
```

`sync-wp-state.sh` usa `jq` para parsear el JSON de stdin del PostToolUse hook.
Si el entorno no tiene jq, el script falla silenciosamente.

**Resultado real:** El fallback jq→python3 fue implementado directamente en `sync-wp-state.sh`
durante T-002. El riesgo está mitigado: si jq no está disponible, python3 actúa como fallback.

---

## R-05: Campo `if` en PostToolUse puede no filtrar paths profundos

```
Probabilidad: media (comportamiento de * con separadores no verificado)
Impacto: bajo (solo performance, no funcional)
Severidad: baja
Estado: ACEPTADO — mitigado por filtro interno en sync-wp-state.sh
```

El campo `if: "Write(/.claude/context/work/*)"` puede no filtrar correctamente
si `*` no atraviesa separadores de directorio en paths profundos.

**Resultado real:** En Phase 6, la decision fue NOT incluir el campo `if` y dejar
que el script filtre internamente — elimina la ambiguedad del comportamiento de `*`.
El script hace exit 0 rapidamente si el path no es un WP, sin impacto funcional.
