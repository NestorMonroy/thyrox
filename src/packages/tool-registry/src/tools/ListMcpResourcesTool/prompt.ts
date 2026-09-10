/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/tools/ListMcpResourcesTool/prompt.ts`
 * (TASK #232). Sin dependencias. Las cadenas PROMPT/DESCRIPTION son
 * contenido dirigido al modelo — se portan VERBATIM (no se traducen: son
 * dato del contrato de la herramienta, no comentario).
 */
export const LIST_MCP_RESOURCES_TOOL_NAME = 'ListMcpResourcesTool'

export const DESCRIPTION = `
Lists available resources from configured MCP servers.
Each resource object includes a 'server' field indicating which server it's from.

Usage examples:
- List all resources from all servers: \`listMcpResources\`
- List resources from a specific server: \`listMcpResources({ server: "myserver" })\`
`

export const PROMPT = `
List available resources from configured MCP servers.
Each returned resource will include all standard MCP resource fields plus a 'server' field 
indicating which server the resource belongs to.

Parameters:
- server (optional): The name of a specific MCP server to get resources from. If not provided,
  resources from all servers will be returned.
`
