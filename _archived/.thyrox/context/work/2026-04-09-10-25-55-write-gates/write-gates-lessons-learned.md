```yml
type: Lecciones Aprendidas
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
created_at: 2026-04-09 11:30:00
version: 2.3.0
```

# Lecciones Aprendidas — FASE 26: write-gates

## Resumen

FASE 26 resolvió TD-027. 2 tareas, 2 archivos. Raíz del problema: dos planos de aprobación
(SKILL gates + Claude Code tool permissions) nunca documentados ni configurados juntos.
Reducción: Phase 7 normal de 7 prompts a 0 prompts post-gate.

---

## L-106: Edit/Write tool SÍ requieren aprobación por defecto — no asumir auto-approve

**Observacion:** El análisis inicial de FASE 26 asumió que la herramienta Edit no necesitaba
aprobación. La documentación oficial desmiente esto:

> File modification (Edit/Write files): approval required. "Yes, don't ask again" = until session end.

Esto explica por qué editar `now.md` y `focus.md` en Phase 7 generaba prompts, no solo los
comandos Bash.

**Leccion:** Consultar siempre la tabla de aprobaciones de la documentación oficial antes de
asumir el comportamiento de una herramienta. Read-only = auto. Edit/Write = prompt por defecto.
Bash = prompt por defecto. `defaultMode: acceptEdits` cambia solo Edit/Write, no Bash.

---

## L-107: Los dos planos de aprobación deben configurarse juntos

**Observacion:** El framework tenía gates metodológicos correctos (Phase gates, GATE OPERACION)
pero cero configuración de permisos de herramienta. El resultado fue fricción acumulada:
7 prompts de tool permissions después de un gate metodológico ya aprobado.

**Causa:** Los dos planos nunca se modelaron como sistemas separados que deben alinearse:
- Plano A: gates de decision del SKILL (cuando el humano decide)
- Plano B: permisos de herramienta de Claude Code (que operaciones corren sin prompt)

**Leccion:** Al diseñar un flujo con gates, definir explicitamente qué ocurre en Plano B
dentro de cada fase. El gate de fase (Plano A) debe ser la única fricción para operaciones
rutinarias post-gate. Todo lo demás va a `allow`.

---

## L-108: `ask` rules son superiores a `deny` rules para archivos de uso frecuente

**Observacion:** La opción de `deny` para SKILL.md y CLAUDE.md habría bloqueado ~80% de las
FASEs del framework (que modifican esos archivos como parte normal de su trabajo).

**La distincion clave:**
- `deny`: bloqueo absoluto — correcto para operaciones que nunca deben ocurrir (rm -rf, force push)
- `ask`: prompt forzado — correcto para operaciones que deben ocurrir pero con conciencia humana

**Leccion:** La pregunta no es "¿queremos gate?" sino "¿queremos bloqueo o prompt?". Para
archivos de configuración del framework: prompt (ask). Para operaciones destructivas: bloqueo (deny).

---

## L-109: `git push` es consecuencia del gate de fase, no una decision nueva

**Observacion:** El análisis inicial dejaba `git push` como `ask` (1 prompt). El usuario
corrigió: `git push` regular es consecuencia del gate Phase 6→7, no una nueva decisión.

**La distinción correcta:**
- `git push --force` → `deny` — reescribe historia, nunca es consecuencia automática
- `git push` → `allow` — es el desenlace natural después de que el humano aprobó Phase 7

**Leccion:** Mapear cada operación a su gate de decisión real. Si el gate ya ocurrió en
Plano A, la operación en Plano B debe ser automática.

---

## Métricas de la FASE

| Métrica | Valor |
|---------|-------|
| Archivos modificados | 2 (settings.json, SKILL.md) |
| Tareas ejecutadas | 2 (T-001, T-002) |
| Prompts en Phase 7 normal antes | 7 |
| Prompts en Phase 7 normal despues | 0 |
| TDs cerrados | TD-027 |
| Lecciones | L-106..L-109 |
