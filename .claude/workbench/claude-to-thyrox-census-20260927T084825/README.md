# Censo de «Claude» antes de migrar a thyrox (TASK #67)

Punto de partida medido de las tres fases: formatos (A), identificadores (B)
y texto visible y comentarios (C).

- `identifiers-tree.txt`: formas de identificador con «Claude» en todo el árbol.
- `repl-src-lines.txt`: líneas de `repl/src` que lo nombran.
- `repl-visible-lines.txt`: el subconjunto que llega al usuario como texto.

Métrica: líneas y formas por `rg`, sin `dist/`. Ciega a: literales construidos
por concatenación y al texto de los prompts `.txt` vendorizados.
