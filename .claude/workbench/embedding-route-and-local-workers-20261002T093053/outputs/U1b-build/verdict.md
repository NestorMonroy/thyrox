# U1b — reconstrucción de la imagen del laboratorio con `llama-embedding`: FALLÓ por disco

- Libre antes: 4 348 448 768 B; después: 4 253 855 744 B (`df -B1 /`, mismo disco que `/var/lib/containers`).
- Pared 1:49.89; la capa `RUN pip install torch…` (1.11 GB en la imagen vigente) murió al escribirse:
  `write …/libtorch_cpu.so: no space left on device`.
- No reutilizó caché: la imagen vigente `ddf16d444d8b` se construyó con `ARG PIP_CERT` y otro puerto
  de proxy; la Containerfile actual declara `PROXY_CA`, así que la capa de torch se reconstruye entera.
- Intermedios propios de la pasada fallida: 0.8 MB únicos (`podman system df -v`); nada que recuperar.
- Lo único que liberaría el pico es retirar la imagen vigente (1.28 GB, sin dueño declarado; la usa
  el laboratorio de TASK-THYROX-0747). No se retira sin decisión: es la condición de parada de recurso.
- La base `ghcr.io/ggml-org/llama.cpp` `9ace0117e8ff` es etapa de esta construcción y dependencia de la
  ruta B: T005a NO debe retirarla mientras la ruta B dependa de ella.
- La Containerfile queda sin commitear hasta que una construcción la verifique.
