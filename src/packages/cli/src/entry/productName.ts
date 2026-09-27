/**
 * El nombre con que la cli se presenta al usuario. Vive en
 * `@thyrox/config/product`, que también usan los paquetes con texto visible
 * que la cli no puede exportarles (el REPL); aquí se re-exporta para que las
 * rutas existentes sigan resolviendo al mismo valor.
 */
export { PRODUCT_NAME } from '@thyrox/config/product'
