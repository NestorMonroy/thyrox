/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/specs/pyright.ts` — spec Fig
 * del comando `pyright` (verificador de tipos para Python).
 */
import type { CommandSpec } from '../registry.js'

export default {
  name: 'pyright',
  description: 'Verificador de tipos para Python',
  options: [
    { name: ['--help', '-h'], description: 'Mostrar mensaje de ayuda' },
    { name: '--version', description: 'Imprimir la versión de pyright y salir' },
    {
      name: ['--watch', '-w'],
      description: 'Continuar corriendo y vigilar cambios',
    },
    {
      name: ['--project', '-p'],
      description: 'Usar el archivo de configuración en esta ruta',
      args: { name: 'FILE OR DIRECTORY' },
    },
    { name: '-', description: 'Leer la lista de archivos o directorios desde stdin' },
    {
      name: '--createstub',
      description: 'Crear archivo(s) de stub de tipos para un import',
      args: { name: 'IMPORT' },
    },
    {
      name: ['--typeshedpath', '-t'],
      description: 'Usar stubs de tipos typeshed en esta ruta',
      args: { name: 'DIRECTORY' },
    },
    {
      name: '--verifytypes',
      description: 'Verificar completitud de tipos en un paquete py.typed',
      args: { name: 'IMPORT' },
    },
    {
      name: '--ignoreexternal',
      description: 'Ignorar imports externos para --verifytypes',
    },
    {
      name: '--pythonpath',
      description: 'Ruta al intérprete de Python',
      args: { name: 'FILE' },
    },
    {
      name: '--pythonplatform',
      description: 'Analizar para esta plataforma',
      args: { name: 'PLATFORM' },
    },
    {
      name: '--pythonversion',
      description: 'Analizar para esta versión de Python',
      args: { name: 'VERSION' },
    },
    {
      name: ['--venvpath', '-v'],
      description: 'Directorio que contiene entornos virtuales',
      args: { name: 'DIRECTORY' },
    },
    { name: '--outputjson', description: 'Emitir resultados en formato JSON' },
    { name: '--verbose', description: 'Emitir diagnósticos detallados' },
    { name: '--stats', description: 'Imprimir estadísticas de rendimiento detalladas' },
    {
      name: '--dependencies',
      description: 'Emitir información de dependencias de import',
    },
    {
      name: '--level',
      description: 'Nivel mínimo de diagnóstico',
      args: { name: 'LEVEL' },
    },
    {
      name: '--skipunannotated',
      description: 'Omitir el análisis de tipos de funciones sin anotar',
    },
    {
      name: '--warnings',
      description: 'Usar código de salida 1 si se reportan warnings',
    },
    {
      name: '--threads',
      description: 'Usar hasta N hilos para paralelizar la verificación de tipos',
      args: { name: 'N', isOptional: true },
    },
  ],
  args: {
    name: 'files',
    description:
      'Especificar archivos o directorios a analizar (anula el archivo de config)',
    isVariadic: true,
    isOptional: true,
  },
} satisfies CommandSpec
