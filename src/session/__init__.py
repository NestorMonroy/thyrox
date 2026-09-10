"""El registro de trabajos lanzados en segundo plano por una sesión, y su
barrera — bloquear el turno hasta que TODOS se asienten.

Se llama ``session`` y no ``jobs`` a secas porque el registro es **por
sesión** (un directorio de ledger distinto por sesión, en el consumidor real);
lo que vive aquí es el mecanismo, sin ese detalle de ubicación (DEC-04).
"""
