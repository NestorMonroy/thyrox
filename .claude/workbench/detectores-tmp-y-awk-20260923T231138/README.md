# Detectores: escribir en /tmp y awk a secas

Dos defectos de la sesión del 2026-09-23, cada uno con su detector en
`pretooluse_dispatch`. Los positivos de cada suite son comandos de esa sesión,
verbatim.

| Archivo | Qué es |
|---|---|
| `rojo-temp_home_write.txt`, `rojo-bare_awk.txt` | las suites sin sus módulos: `FileNotFoundError`, rc=1 |
| `verde-temp_home_write.txt` | 15 ok; su caso 6 anula el filtro de escritura y caen exactamente los tres casos de lectura |
| `verde-bare_awk.txt` | 11 ok; su caso 4 anula el ancla de posición de comando y caen exactamente la cadena y el `grep`, no `gawk` |

Suites del despachador tras registrarlos: `test_pretooluse_dispatch.py` 17 ok,
`test_detect_agent_dispatch.py` 8 casos sin fallos.
