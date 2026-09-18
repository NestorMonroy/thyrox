import * as React from 'react'
import { Text } from '@thyrox/ink'

export function InterruptedByUser(): React.ReactNode {
  return (
    <>
      <Text dimColor>Interrupted </Text>
      <Text dimColor>· What should Claude do instead?</Text>
    </>
  )
}
