# Agrupar la ruta 2 por forma del tipo — TASK-THYROX-0253 (h-thyrox-185)

`tsc_routes.duplicated_types` agrupaba por nombre. Ahora agrupa por forma:
discriminante literal, cabeza de la intersección/unión, campos de primer
nivel (inclusión estricta, o ≥2 comunes y ≥50 % del menor). Un alias
`= import(...)` no es copia; un marcador (`unknown`, `Record<string, unknown>`)
es copia reducida y se suma al mayor grupo concreto; un nombre con más de 10
grupos de forma es convención (`Props`).

- `compare_step134.py` / `.tsv`: los 19 nombres del paso 134, antes y después.
  Las 5 unidades que propusieron ediciones siguen; de las 9 «otro tipo», 4
  desaparecen y 5 pierden la copia distinta; de las 3 «ya canónico», 2
  desaparecen (AppState queda en 2: un marcador).
- `shape_group_counts.py` / `.tsv`: grupos de forma por nombre; de ahí el
  umbral 10 (Props 155, el siguiente 8).
- `annulments.log`, `annulments-2.log`: una anulación por mitad de juicio;
  cada una tumba exactamente sus casos.

*Ciega a:* si el tipo que queda en la unidad es el que tsc cita; la forma se
lee por texto, no por el compilador.
