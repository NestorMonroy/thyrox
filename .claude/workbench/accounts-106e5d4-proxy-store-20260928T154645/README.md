# #106e-5d-4 — el proxy local lee credenciales del store

`startProxyServer` acepta `connections`, el store de conexiones de proveedor.
Un upstream sin credenciales declaradas toma las de su proveedor, releídas en
cada petición y convertidas con `accounts/proxyCredentials.ts`; las que no son
OAuth quedan bajo los límites adaptativos al leerse.

- `red-106e5d4.txt`: la mitad roja.
- `annul-106e5d4.sh`: 6 anulaciones; `rerun-106e5d4.sh` repite la 5.
- `results-106e5d4.txt`: las dos pasadas.

Divergencia con la referencia: OmniRoute decide la protección por el tipo de
autenticación de la conexión; aquí también, leyendo `attributes.auth_type` de
cada credencial del store, mientras las declaradas siguen decidiéndose por los
rasgos del proveedor.
