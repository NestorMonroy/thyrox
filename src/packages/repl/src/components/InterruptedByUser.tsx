import * as React from 'react'
import { Text } from '@anthropic/ink'
import { PRODUCT_NAME } from '@thyrox/config/product'

export function InterruptedByUser(): React.ReactNode {
  return (
    <>
      <Text dimColor>Interrupted </Text>
      <Text dimColor>· What should {PRODUCT_NAME} do instead?</Text>
    </>
  )
}
