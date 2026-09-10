# ERR-005 — «corregido a 126» sin read-back, y el script escribió sobre otra línea

**Afirmé:** «underline corregido a 126».

**Qué pasó:** el script usaba `i = 10` (índice 0) suponiendo que la línea 11 era
el título. Era **el underline**. Sobrescribió la línea 12 y dejó un underline
duplicado — y el mensaje de éxito se imprimió sin leer el archivo después.

**Medido al arreglarlo bien:** título en la línea 10 con 127 caracteres; líneas
11 y 12 ambas con 126 `=`.

**Quién lo delató:** `check-rst-sintaxis`, que volvió a bloquear.

**Doble defecto:** el índice equivocado es de código; **la afirmación sin
read-back es del gate de verificación** — el resultado esperado se reportó como
observado.
