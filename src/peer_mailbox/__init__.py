"""Buzón (*mailbox*) durable para que N agentes se hablen entre procesos.

Adaptación de la idea de ``ccnmt: packages/swarm/src/mailbox/`` —un archivo
de entrada (*inbox*) por agente, escrito bajo bloqueo, con deduplicación por
``request_id``— a las dos restricciones duras de nuestra plataforma, medidas
en ``bash-background-tasks.md``: un subagente no descubre pares ni puede
lanzar otros (profundidad 1), y el único canal directo que tiene es
``SendMessage({to: "main"})``. Por eso el medio es un **archivo compartido**
y no un canal: lo que un par escribe sobrevive a que su proceso muera, y el
orquestador sigue siendo quien despierta a quien corresponda.

El paquete NO se llama ``mailbox`` porque ese nombre es de la biblioteca
estándar (``/usr/lib/python3.11/mailbox.py``, medido): con ``src`` en
``sys.path`` lo eclipsaría, y el mecanismo en memoria de
``src/packages/agent/runtime/mailbox.ts`` ya ocupa la palabra dentro del
árbol. ``peer`` es el término de la referencia para el par que no es el
líder (``getLastPeerDmSummary``, «peer DMs»).

Dos módulos:

- :mod:`peer_mailbox.envelope` — el sobre con que un mensaje se presenta al
  modelo, inmune a que su cuerpo lo cierre.
- :mod:`peer_mailbox.inbox` — el medio durable *append-only*, la entrega, el
  acuse (*ack*) y la línea de comandos.
"""
