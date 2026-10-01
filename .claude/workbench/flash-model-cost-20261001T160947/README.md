# flash-model-cost

## El encargo

<!-- verbatim, sin parafrasear -->

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|

## Los resultados

*Metrica:*
*Ciega a:*

## Resultado (2026-10-01)

Pregunta: ¿qué cuesta una ejecución REAL de un agente de thyrox en cada modelo Flash, y qué decide el costo?

**Vectores medidos** (`outputs/price_runs.txt`, `probes/price_runs.py`): 505 agentes con
telemetría de transcript de 1942 en el store. El 98.32 % de la entrada es acierto de caché y la
salida es el 0.04 % de todos los tokens. El precio de salida casi no mueve el total; lo decide el
precio de la caché.

Agente mediano con la tabla de precios del ejecutor (sin verificar aquí):

| Modelo | USD agente mediano |
|---|---|
| deepseek-v4.1-flash off-peak (caché 0.003) | 0.1426 |
| deepseek-v4.1-flash peak (caché 0.006) | 0.2852 |
| qwen3.7-flash mín., sin descuento de caché | 0.6788 |
| qwen3.8-flash, sin descuento de caché | 3.3929 |
| qwen3.8-max, sin descuento de caché | 45.2380 |

qwen3.8-flash empata con DeepSeek off-peak sólo si su caché cuesta ≤ 0.0031 USD/M (2.0 % de su entrada).

**Sonda de caché y llamada a herramienta** en el endpoint de Token Plan (`outputs/cache-and-tool-call-probe.json`),
el mismo prompt de ~6.6 k tokens dos veces por modelo, n = 1 par por modelo:

| Modelo | 2.ª petición cacheada | Llamada a herramienta |
|---|---|---|
| qwen3.8-flash | 6144 / 6594 (93 %) | `read_file {"path": "README.md"}` |
| deepseek-v4.1-flash | 6784 / 6911 (98 %) | `read_file {"path": "README.md"}` |

Métrica: `usage.prompt_tokens_details.cached_tokens` de la API compatible con OpenAI.
Ciega a: el precio de la caché de Qwen (la tabla no lo trae), a si la cuota de un Token Plan descuenta
los tokens cacheados, a la fracción cacheable con prompts y herramientas reales del pool, y a la
calidad del trabajo (la sonda prueba el protocolo, no la competencia).

## Clasificación (directiva del ejecutor, 2026-10-01)

Esto es evidencia para la fase de cualificación y recomendador neutrales al proveedor, no una
decisión de enrutamiento. Ningún pool se enruta a DeepSeek ni a Qwen a partir de aquí.

**Medido**
- la distribución real de tokens de 505 agentes del store;
- 98.3 % de la entrada como acierto de caché en esa muestra;
- la salida, prácticamente irrelevante en el costo total;
- los dos endpoints cachearon la segunda petición;
- los dos emitieron una llamada a herramienta válida en esa sonda.

**No demostrado**
- la calidad de resolución de tareas;
- la equivalencia funcional con los agentes actuales;
- el precio real de los tokens cacheados de Qwen;
- el costo efectivo de la clave de Token Plan;
- que DeepSeek deba ser el worker productivo por defecto: queda como hipótesis candidata.
