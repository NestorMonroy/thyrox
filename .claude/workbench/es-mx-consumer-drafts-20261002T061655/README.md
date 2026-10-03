# Borradores del trabajo del consumidor ai-course-notes (2026-10-02)

## El encargo

<!-- verbatim, sin parafrasear -->

> la inbormacion que pusiste en scratchpad tiene que ir en /home/user/thyrox/.claude/workbench/ /home/user/thyrox/.claude/build-logs/ /home/user/thyrox/.claude/cache/ /home/user/thyrox/.claude/logs/

## La premisa, si se corrigio al primer comando

Ninguna: el encargo se ejecutó tal como se pidió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/p5b/Containerfile` | Imagen de ejecución de ai-course-notes: la base de thyrox más lo que el call |
| `probes/p5b/finish.sh` | borrador del cambio, tal como se aplicó |
| `probes/p5b/identity-case.sh` | Caso 5: la identidad del consumidor se reconstruye desde la evidencia publicada. |
| `probes/p5b/identity.py` | borrador del cambio, tal como se aplicó |
| `probes/p5b/unit-base.out` | borrador del cambio, tal como se aplicó |
| `probes/p5b/unit-final.out` | borrador del cambio, tal como se aplicó |
| `probes/p5b/unit-suite.out` | borrador del cambio, tal como se aplicó |
| `probes/p7/baseline.sh` | borrador del cambio, tal como se aplicó |
| `probes/p7/finish.sh` | borrador del cambio, tal como se aplicó |
| `probes/p7/fix2.py` | borrador del cambio, tal como se aplicó |
| `probes/p7/impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p7/red.py` | borrador del cambio, tal como se aplicó |

## Los resultados

p7/: el cambio de ejecutor del ciclo es-MX (ai-course-notes 92d6db1, 3d4e027).
p5b/: la imagen de ejecución del consumidor y la equivalencia anfitrión ↔ unidad
(ai-course-notes 9316d28). Los bancos con la evidencia viven en ai-course-notes:
.claude/workbench/executor-qwen-20261002T010314 y execution-image-equivalence-20261002T020353.

*Metrica:* borradores conservados por paso.
*Ciega a:* el resultado de esos cambios: vive en los bancos de ai-course-notes.
