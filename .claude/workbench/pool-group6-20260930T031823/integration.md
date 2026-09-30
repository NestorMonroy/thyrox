# Integración del grupo 6

| Ítem | Tarea | Veredicto del pool | Integración |
|---|---|---|---|
| 1 | TASK-THYROX-0347 — estado de carga remota de policySettings | verificado | `dc1ef30e`; 11 pass en el árbol principal, typecheck de `config` limpio |
| 2 | TASK-THYROX-0515 — tabla de paridad del daemon (D4) | rechazado | `333db3a0`; aplicado a mano: el rechazo es de forma (no tocó ninguna prueba) y la tarea resultó ser sólo documental — ningún `catch` discrepaba de su comentario de porte |
| 3 | TASK-THYROX-0614 — perfil de worker especializado | verificado | `4b8ca864`; 24 pass, typecheck de `daemon` limpio |

Un ítem de este grupo ejecutó `bin/binary extract` con `THYROX_ROOT` en el
árbol principal: el ejecutable vivo ya era 2.1.285, así que escribió ese
corpus en `_references/` del árbol principal. El ejecutor decidió
conservarlo (`a9c8af5f`). El grupo 7 ya no recibe esa instrucción
(`b23d8710`).
