"""El registro de trabajos en segundo plano — no de agentes.

Se llama ``roster`` y no ``agents`` a propósito: lo que guarda son entradas de
trabajo (una por tarea lanzada), no una noción de agente con identidad propia;
y ``agents`` colisionaría con ``.claude/agents/``, que es otra cosa.
"""
