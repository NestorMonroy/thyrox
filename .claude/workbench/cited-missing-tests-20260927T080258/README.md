# Pruebas que el código cita y no existen

Un módulo que dice «ver X.test.ts, que atrapa Y» promete un control. Si el
archivo no existe, nadie lo cumple: `keyBlocklist.ts` citaba su control de
paridad con el ejecutor, no existía, y al escribirlo destapó el bypass de
`lalt`/`ralt` (8b3a95ea).

- `citations.txt`: menciones a `*.test.ts(x)` en fuentes de `src/packages`
  (sin `__tests__`, sin pruebas, sin `dist`), por `git grep`.
- `existing.txt`: nombres de prueba versionados en `src/packages`.
- `missing.txt` / `missing-citations.txt`: los citados que no existen, y dónde.

Métrica: nombre de archivo citado frente a nombres versionados.
Ciega a: una cita a una prueba que existe con otro nombre o en otro árbol, y
a si la cita es una promesa de control o texto de ejemplo (las lecciones de
`powerup` citan `auth.test.ts` como mención de muestra): eso se tría leyendo.
Tarea: #66.
