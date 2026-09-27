// Canonical owner is @thyrox/provider/apiLimits.
export * from '@thyrox/provider/apiLimits.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { API_IMAGE_MAX_BASE64_SIZE, API_MAX_MEDIA_PER_REQUEST, API_PDF_MAX_PAGES, IMAGE_MAX_HEIGHT, IMAGE_MAX_WIDTH, IMAGE_TARGET_RAW_SIZE, PDF_AT_MENTION_INLINE_THRESHOLD, PDF_EXTRACT_SIZE_THRESHOLD, PDF_MAX_EXTRACT_SIZE, PDF_MAX_PAGES_PER_READ, PDF_TARGET_RAW_SIZE } from '@thyrox/provider/apiLimits.js'
