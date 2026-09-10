/**
 * Adaptación de `ccnmt: packages/app-host/src/context/mailbox.tsx`.
 * Capa 0 (sin cita a paquete hermano ausente) — porte verbatim, sin
 * divergencias. `Mailbox` se importa como valor desde
 * `@thyrox/agent/runtime/mailbox.js` — resuelve: `@thyrox/agent` YA es
 * dependencia declarada de `@thyrox/app-host` (`package.json`), y el
 * subpath lo alcanza el wildcard `./*` -> `./*.ts` del `package.json` de
 * `@thyrox/agent` (verificado con `Bun.resolveSync`).
 */
import React, { createContext, useContext, useMemo } from 'react'
import { Mailbox } from '@thyrox/agent/runtime/mailbox.js'

const MailboxContext = createContext<Mailbox | undefined>(undefined)

type Props = {
  children: React.ReactNode
}

export function MailboxProvider({ children }: Props): React.ReactNode {
  const mailbox = useMemo(() => new Mailbox(), [])
  return (
    <MailboxContext.Provider value={mailbox}>
      {children}
    </MailboxContext.Provider>
  )
}

export function useMailbox(): Mailbox {
  const mailbox = useContext(MailboxContext)
  if (!mailbox) {
    throw new Error('useMailbox must be used within a MailboxProvider')
  }
  return mailbox
}
