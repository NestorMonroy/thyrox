# ai-course-notes → thyrox: qué se puede aplicar

Fuente: `NestorMonroy/ai-course-notes@717e2df`, 370 notas en LaTeX en chino, con
su fuente original junto a ellas (`content.txt`, `*.en.srt`, `original_*.txt`).

## Método

1. **Triaje**: título de sección y ruta de las 370 notas contra diez ejes de
   thyrox (`probes/triaje.awk`), más las colecciones centrales por tema
   (`articles`, `cs146s`, `modern-agent`, `self-evolving-agents-2026`). Quedan
   38 notas.
2. **Pareo con la fuente**: 32 de las 38 tienen fuente; de sus 56 archivos, 25
   están en inglés (idioma medido por proporción de caracteres CJK,
   `outputs/idioma-fuentes.tsv`). Se leyó primero la fuente original, con la
   nota china como mapa.
3. **Lectura a fondo**: cinco lectores en paralelo, uno por eje. Cada idea
   recibió un veredicto tras medir thyrox con `rg`/`find`: `YA-EXISTE`,
   `PARCIAL`, `AUSENTE-APLICABLE` o `NO-APLICA`. Los informes están en
   `outputs/informe-G1..G5.md`.
4. **Verificación independiente** de las afirmaciones principales (tabla de
   abajo). Los conteos de cada informe son testimonio del lector: **nivel 3,
   no verificados uno a uno**.

## Conteo reportado por grupo (testimonio de los lectores)

| Grupo | Ideas | Ya existe | Parcial | Ausente y aplicable | No aplica |
|---|---|---|---|---|---|
| G1 harness engineering | 33 | 10 | 9 | 9 | 3 |
| G2 internos de un coding agent | 32 | 20 | 7 | 1 | 3 (+1 mixta) |
| G3 herramientas, skills y MCP | 47 | 18 | 11 | 14 | 4 |
| G4 evaluación y verificación | 33 | 14 | 9 | 5 | 5 |
| G5 contexto, memoria y práctica | 20 | 7 | 7 | 4 | 2 |
| **Total** | **165** | **69** | **43** | **33** | **17** |

## Verificado por medición propia

| Afirmación | Medición | Resultado |
|---|---|---|
| no hay guarda de anchura/profundidad de subagentes (G2) | `rg 'MAX_CONCURRENT_SUBAGENTS\|MAX_SUBAGENT_SPAWN_DEPTH\|nesting limit' src/packages` | **0 hits**: confirmado |
| ninguna regla usa `paths:` (G5) | `rg -l '^paths:' .claude/rules` | **0 de 7** en thyrox y **0 de 39** en kaupamex-docs: confirmado. G5 decía «0 de 30»; la cifra no es de este árbol |
| el mecanismo de `paths:` existe (G3) | `src/rules/types.ts` (`domain` con globs) | confirmado. No contradice a G5: G3 midió el **mecanismo** y G5 la **adopción** |
| no hay aviso de comandos destructivos (G5, G3) | `rg 'rm -rf\|DROP TABLE\|push --force' src/hooks/*.py` | **0**: confirmado |
| número de detectores de `pretooluse_dispatch.py` | `detect_*` importados | **17**. G1 decía 10, G5 20 y G3 25: las tres están mal |
| número de skills | `find -name SKILL.md` | **172** en thyrox. G3 decía 142 |
| no hay detector de edición repetida en bucle (G1) | `rg -i 'doom.?loop\|repeated.?edit' src` | **0**: confirmado |
| existen el VCR, el bucle generar-verificar-corregir y el control de mutantes (G4) | `test -f` sobre `provider/src/vcr.ts`, `verify/tsc_zero_loop.py`, `verify/check_mutante_en_staging.py`, `transcript/tool_events.py` | los cuatro **existen**: confirmado |
| no hay helper de aserción de trayectoria (G4) | `rg assert_tool_called src tests` | **0**: confirmado |
| no hay detector de relevo de permisos entre pares (G4) | hooks `relay\|launder\|peer` | **0**: confirmado |

*Métrica:* presencia de símbolos y archivos en el árbol de thyrox.
*Ciega a:* si una pieza «existente» hace lo que la nota describe (eso lo
afirma el lector, no esta tabla), y a las ideas de las 332 notas que el
triaje no seleccionó.

## Propuestas, deduplicadas y ordenadas

| # | Propuesta | Origen | Estado medido | Por qué va arriba |
|---|---|---|---|---|
| 1 | **Adoptar `paths:` en las reglas**: las de dominio cargan sólo cuando se tocan sus rutas | G5, G3 | mecanismo sí, adopción 0/7 y 0/39 | ataca directamente el piso de ~126 000 tokens por turno de cada subagente que el `CLAUDE.md` mide |
| 2 | **Guarda de anchura y profundidad de subagentes** en la herramienta Agent (rehusar el N+1 y el anidamiento, como el binario) | G2 | ausente | es contrato del binario que thyrox reimplementa y que una regla del consumidor ya da por cierto |
| 3 | **Gate de operaciones irreversibles** (`rm -rf`, `git reset --hard`/`push --force` con árbol sucio, `DROP`/`TRUNCATE`) | G5, G3 | ausente | primer detector que merecería **bloquear**: el daño no se revierte, a diferencia de los otros 17 |
| 4 | **Detector de edición en bucle**: el mismo archivo editado ≥ N veces en un turno | G1 | ausente | mide una falla real de agentes largos con un contador barato |
| 5 | **Aserciones de trayectoria** (`assert_tool_called`…) sobre `src/transcript/tool_events.py` | G4 | los datos existen, falta el helper | convierte los transcripts en tests de conducta |
| 6 | **Detector de relevo de permisos entre pares** | G4 | ausente; sólo prosa en el consumidor | mecaniza en el proveedor una regla que hoy vive sólo como texto |
| 7 | **Medir qué skills se usan** (evento de la herramienta Skill al store) y un bucle de mejora por checklist | G3 | ausente | 172 skills sin medición de uso |
| 8 | **Hallazgo repetido → propuesta de edición de regla** | G5 | memoria episódica sí; cierre del ciclo no | cierra el aprendizaje entre sesiones |
| 9 | Poda de resultados de herramienta en dos niveles, separada de la compactación | G1 | parcial (sólo hay menciones en puentes) | a medir antes de afirmar |
| 10 | Herramienta de espera/cierre de subagente con plazo, y volcado del payload del API tras bandera | G2 | ausente | útil pero de menor impacto |

Lo que **no aplica**, en resumen: técnicas que exigen entrenar o ajustar
modelos (RL, SFT, DPO), la Message Batches API, y patrones de atención al
cliente (escalar a un humano).
