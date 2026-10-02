# Ayudantes para ejecutar en ExecutionUnits (2026-10-02)

## El encargo

<!-- verbatim, sin parafrasear -->

> la inbormacion que pusiste en scratchpad tiene que ir en /home/user/thyrox/.claude/workbench/ /home/user/thyrox/.claude/build-logs/ /home/user/thyrox/.claude/cache/ /home/user/thyrox/.claude/logs/

## La premisa, si se corrigio al primer comando

Los guiones estaban sueltos en la raíz del banco; se movieron a probes/.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/annul-sh.py` | annul-sh.py <banco> <comando> <nombre>=<archivo>::<viejo>::<nuevo>...: anula, corre, restaura; lista las FALLA.""" |
| `probes/annul.py` | annul.py <banco> <ruta-de-pruebas> <comando-de-prueba> <nombre>=<archivo>::<viejo>::<nuevo> ... |
| `probes/unit.sh` | unit.sh <TASK> <nombre> <líneas de cola> <comando bash>: corre en una ExecutionUnit y muestra la cola. |
| `probes/unitw.sh` | unitw.sh <CONSUMIDOR:ID> <nombre> <líneas de cola> <comando bash>: corre en una ExecutionUnit y muestra la cola. |

## Los resultados

Los usó esta sesión para escribir, probar, anular y commitear SIN ejecutar el
payload en el anfitrión (TASK-THYROX-0756…0761 y el trabajo del consumidor
ai-course-notes). Estaban en el scratchpad de la sesión; se versionan aquí.

- unit.sh <TASK> <nombre> <cola> <cmd>: thyrox-bg start --task … --kind test, espera y muestra la cola.
- unitw.sh <CONSUMIDOR:ID> …: lo mismo con --work (referencia de trabajo del consumidor).
- annul.py / annul-sh.py: anulan una guarda por sustitución literal, corren la prueba y restauran.
  Defecto conocido: separan por «::», así que un ancla que termina en «:» se parte mal
  (episodio de la anulación de la política en P7); las anulaciones posteriores usan sed y
  comprueban la sintaxis antes de medir.

*Metrica:* guiones conservados y su defecto conocido.
*Ciega a:* si un trabajo se lanzó sin ellos: el banco conserva el instrumento, no el registro de uso.
