// La verificación de firma de la hoja con la API X509Certificate del runtime, sin TLS de por medio.
import fs from 'node:fs'
import { X509Certificate } from 'node:crypto'
const dir = process.argv[2]
const ca = new X509Certificate(fs.readFileSync(`${dir}/ca.crt`))
const leaf = new X509Certificate(fs.readFileSync(`${dir}/leaf.crt`))
console.log(`${typeof Bun === 'undefined' ? 'node' : 'bun'}: verify=${leaf.verify(ca.publicKey)} checkIssued=${leaf.checkIssued(ca)}`)
