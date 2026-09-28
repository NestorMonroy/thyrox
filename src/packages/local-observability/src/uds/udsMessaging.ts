/**
 * El buzón por socket de la sesión. La ruta es la de la referencia
 * (`./socketPath.ts`); el servidor todavía no escucha.
 */
import { defaultUdsSocketPath } from './socketPath.ts'

// pendiente: el servidor `mn` de 2.1.283 (bind, autenticación y entrega de mensajes); hasta entonces no se abre ningún socket.
export const startUdsMessaging: (socketPath: string, options: { isExplicit: boolean }) => Promise<void> = async () => {}

export const getDefaultUdsSocketPath = (): string => defaultUdsSocketPath()
