/** Un HAR como adjunto para descargar, sin caché. */
import type { HarFile } from '../../../inspector/harExport.ts'

export function harAttachment(har: HarFile, filename: string): Response {
  return new Response(JSON.stringify(har, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
