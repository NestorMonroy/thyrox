# Ayudantes para ejecutar en ExecutionUnits (2026-10-02)

Los usó esta sesión para escribir, probar, anular y commitear SIN ejecutar el
payload en el anfitrión (TASK-THYROX-0756…0761 y el trabajo del consumidor
ai-course-notes). Estaban en el scratchpad de la sesión; se versionan aquí.

- unit.sh <TASK> <nombre> <cola> <cmd>: thyrox-bg start --task … --kind test, espera y muestra la cola.
- unitw.sh <CONSUMIDOR:ID> …: lo mismo con --work (referencia de trabajo del consumidor).
- annul.py / annul-sh.py: anulan una guarda por sustitución literal, corren la prueba y restauran.
  Defecto conocido: separan por «::», así que un ancla que termina en «:» se parte mal
  (episodio de la anulación de la política en P7); las anulaciones posteriores usan sed y
  comprueban la sintaxis antes de medir.
