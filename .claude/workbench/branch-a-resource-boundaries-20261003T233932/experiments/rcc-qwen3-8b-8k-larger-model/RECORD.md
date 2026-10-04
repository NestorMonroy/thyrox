# Experimento — modelo mayor: Qwen3-8B, repo-code-change@1 a 8K (inmutable)

Lanzado 2026-10-04T02:47:03Z (`.claude/jobs/rcc-qwen3-8b-20261004T024703/`). Qwen3-8B Q4_K_M (sha256 `d98cdcbd`,
`Qwen/Qwen3-8B-GGUF@7c41481f`), cualificado antes: `tool-calling@1` 6/6 y `batch-worker-mecanica@1` 4/4, ambos a
8192. Todas las correcciones de la serie presentes; el modelo es lo único que cambia respecto de
`rcc-q3-4b-8k-var-workflow`.

## OBSERVATION

- 9 turnos, cierre `end_turn`; 8004 tokens de entrada (de 8192) y 1621 de salida; 0.9 tok/s (contended);
- 1 `Read`, 4 `Bash` con las pruebas, 3 `Edit` —todos literales y **aplicados**, el primero sobre la línea exacta
  con su sangría—;
- pruebas de `.EEEEEE` a `.FFF...` (4 de 7): fallan el corte en límite de palabra, el límite de longitud y los guiones;
- cierre en texto: `RESULT: blocked`, con la causa (la lógica de corte); veredicto `rechazado` (cambió y el verify falló).

## INTERPRETATION

El modelo mayor sigue el flujo correctamente: lee, prueba, edita en literal, vuelve a probar y declara el bloqueo en
vez de girar o romper el archivo; es el mejor comportamiento de flujo de la serie. No resuelve el algoritmo: queda
MODEL_CAPABILITY sobre el caso de corte. Señal nueva: con 8004 de 8192 tokens de entrada, el contexto puede limitar
a este modelo, que escribe ediciones largas y comentadas —a diferencia de qwen2.5-7b (3710)—. n = 1.

## CURRENT VERDICT

Qwen3-8B no completa `repo-code-change@1` a 8K. Siguiente medida de una sola variable: el mismo modelo a 16K.
