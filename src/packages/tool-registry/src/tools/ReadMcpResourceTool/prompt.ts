/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/tools/ReadMcpResourceTool/prompt.ts`
 * (TASK #232). Sin dependencias. Cadenas dirigidas al modelo — verbatim.
 */
export const DESCRIPTION = `
Reads a specific resource from an MCP server.
- server: The name of the MCP server to read from
- uri: The URI of the resource to read

Usage examples:
- Read a resource from a server: \`readMcpResource({ server: "myserver", uri: "my-resource-uri" })\`
`

export const PROMPT = `
Reads a specific resource from an MCP server, identified by server name and resource URI.

Parameters:
- server (required): The name of the MCP server from which to read the resource
- uri (required): The URI of the resource to read
`
