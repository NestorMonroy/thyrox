/** El contrato de la base de errores sobre SQLite, en memoria. */
import { SQL } from 'bun'

import { openErrorStoreOn } from '../src/errorStore/errorStoreHome.ts'
import { defineErrorStoreContract } from './errorStoreContract.ts'

defineErrorStoreContract('sqlite', async () => {
  const sql = new SQL('sqlite://:memory:')
  return { store: await openErrorStoreOn(sql, 'sqlite'), close: () => sql.close() }
})
