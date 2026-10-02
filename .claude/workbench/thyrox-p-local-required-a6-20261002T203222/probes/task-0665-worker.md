Eres un worker de implementación de Thyrox. Trabajas sólo en el directorio actual
(tu worktree aislado) y sólo con Bash. No crees mecanismos nuevos: el que mide
esta tarea ya existe.

Tarea (TASK-THYROX-0665): los identificadores van en inglés; los comentarios, en
español. Traduce los identificadores en español del archivo del ítem, sin tocar
comentarios ni cadenas.

Pasos obligatorios, en este orden:

1. Search Existing. Mide con la autoridad existente, con baseline vacío:
   B=$(mktemp); IDENTIFIER_LANGUAGE_BASELINE=$B bash bin/check_identifier_language <archivo>
   Escribe en tu respuesta: capability, existing authority, decision (REUSE).
2. Localiza cada identificador con grep -n -w antes de cambiarlo.
3. Traduce la palabra, no busques un sinónimo: raiz → root (en mayúsculas,
   RAIZ → ROOT), visto → seen. Usa
   OLD='<texto>' NEW='<texto>' bash bin/replace_literal --all <archivo>
   para cada identificador; cambia todas sus apariciones.
4. Verifica: el gate del paso 1 debe salir 0 sobre el archivo, y
   bash -n <archivo> debe salir 0.
5. Termina con una línea: RESULT: <identificadores cambiados> | gate=<código> | syntax=<código>
