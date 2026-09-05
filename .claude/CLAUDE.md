# CLAUDE.md — THYROX

El producto vive en `src/`, su suite en `tests/`, y **este directorio es el
estado**: lo que la sesión lee y escribe. La partición es la DEC-01, con
`claw-code` como precedente medido — su `.claude/` contiene `sessions/` y nada
más.

`_archived/` es el THYROX anterior (DEC-02). **No se lee como si fuera vigente**:
se consulta una pieza sólo si hace falta verla, y lo que se recupere se porta
con su procedencia declarada, no se restaura.

Qué hay hoy, y su suite, está en [README.md](../README.md) — no se duplica aquí.

## Por qué este archivo es corto

Medido en `kaupamex-docs` (:ref:`h-docs-104`): **113 reglas, 697 179 bytes, cero
con `paths:`**, o sea ~126 000 tokens de piso que **cada subagente vuelve a
pagar**. THYROX no repite eso. Una regla entra aquí sólo si gobierna **todo**
trabajo en este árbol; si gobierna un dominio, lleva `paths:` y carga sólo ahí;
si describe cómo funciona una pieza, va en la cabecera de la pieza.

## Flujo de sesión

1. Leer el `README.md` — qué existe y cómo se corre.
2. Correr `bash tests/run.sh` antes de tocar nada: el estado de partida se mide,
   no se asume.
3. Trabajar en TDD, con la mitad roja persistida y su control de anulación.
4. Commitear por pathspec y publicar. El árbol no se deja sucio entre turnos.

## Lo que este árbol NO decide por su cuenta

Nada que contradiga una decisión ya registrada en
`kaupamex-docs: source/gestion/pm/docs/iniciativas/actualizar-agentic-ai-thyrox/`.
Ese es el registro de gobierno; aquí vive el código que lo implementa.
