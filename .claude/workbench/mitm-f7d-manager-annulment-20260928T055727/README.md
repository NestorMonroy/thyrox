# Anulaciones del gestor MITM (`src/packages/mitm/src/manager.ts`)

`annul.sh` retira o reordena cada mecanismo, corre `__tests__/manager` y lo
restaura; `results.txt` es su salida.

| Mecanismo | Qué se hizo | Cae |
|---|---|---|
| DNS antes de matar | se retiró la muerte del proceso | las 2 de orden y la de ciclo completo, que espera el servidor detenido |
| DNS antes de matar (orden solo) | se mató antes de retirar el DNS | sólo «retira el DNS antes de matar» |
| candado de arranque | se retiró `tryAcquireMitmStartLock` de `startMitm` | «rehúsa con el candado tomado» |
| fallo en el plazo de gracia | se ignoró `started` | «un servidor que muere al arrancar…» |
| `THYROX_MITM_ROOT_CA_ENABLED` | `rootCaEnabled()` devuelve `false` | la de ciclo con root-ca y la de `certExists` |
| PID muerto marca huérfano | se retiró la marca | «un PID muerto se borra y marca estado huérfano» |

Tras cada anulación el fuente se restaura (`git diff --stat` vacío al final).
