# Experimento — variable 4: reglas del flujo (vigilante con progreso), qwen3-4b (inmutable)

Lanzado 2026-10-04T02:09:40Z (`.claude/jobs/rcc-q3-4b-workflow-20261004T020940/`), base `55609b9b2`. Única variable
respecto de `rcc-q3-4b-8k-var-nul`: un `Edit`/`Write` nuevo aplicado reinicia los totales de las llamadas que no
cambian nada.

## OBSERVATION

- la orden de pruebas corrió 4 veces, cada una tras un `Edit` aplicado distinto, sin detención por total;
- el modelo escribió `from slugify import slugify` (un paquete externo inexistente aquí) y definiciones anidadas;
  pruebas de `.EEEEEE` a `.FF....` (5 de 7);
- tres `Edit` idénticos consecutivos con `old_string` `return slug[:limit]`, rehusados: «la cadena aparece 2
  veces»; el vigilante lo detuvo por `identical-tool-call 3 consecutivas`; veredicto `detenido`.

## INTERPRETATION

La variable funcionó como se diseñó: el ciclo editar → probar ya no se corta, y la detención fue un bucle real
(la misma llamada rehusada tres veces). El límite pasa a ser MODEL_CAPABILITY: importar una dependencia que no
existe, código anidado, repetir un `old_string` ambiguo sin ampliar el contexto. n = 1: la diferencia de
calidad frente a la corrida anterior (6 de 7) cae dentro de la varianza de muestreo y no se atribuye a la variable.

## CURRENT VERDICT

Variable 4 correcta y conservada; no basta para que qwen3-4b complete `repo-code-change@1`.
