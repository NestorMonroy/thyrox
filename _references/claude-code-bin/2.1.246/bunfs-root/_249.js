// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{kwa as s,mwa as c}from"/$bunfs/root/_441.js";c();function l(r,t){let e=[...t].sort(),n=s(r,e.map((d)=>({name:d})),{maxEditDistance:2});if(n)return`No MCP server named "${r}". Did you mean "${n}"? Run \`claude mcp list\` to see all.`;if(e.length===0)return`No MCP server named "${r}". Run \`claude mcp add\` to add one.`;let o=8,i=e.slice(0,o).join(", "),a=e.length>o?` (and ${e.length-o} more \u2014 run \`claude mcp list\` to see all)`:"";return`No MCP server named "${r}". Configured servers: ${i}${a}`}function m(r,t,e){if(e&&t.length===0)return`No MCP server named "${r}". ${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."}`;return l(r,t)+(e?` (${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."})`:"")}
export{l as oB,m as pB};
