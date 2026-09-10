// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Nne}from"/$bunfs/root/chunk-vd630rs0.js";function ptn(r,t){let e=[...t].sort(),n=Nne(r,e.map((a)=>({name:a})),{maxEditDistance:2});if(n)return`No MCP server named "${r}". Did you mean "${n}"? Run \`claude mcp list\` to see all.`;if(e.length===0)return`No MCP server named "${r}". Run \`claude mcp add\` to add one.`;let o=8,s=e.slice(0,o).join(", "),i=e.length>o?` (and ${e.length-o} more \u2014 run \`claude mcp list\` to see all)`:"";return`No MCP server named "${r}". Configured servers: ${s}${i}`}function Lat(r,t,e){if(e&&t.length===0)return`No MCP server named "${r}". ${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."}`;return ptn(r,t)+(e?` (${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."})`:"")}
export{ptn,Lat};
