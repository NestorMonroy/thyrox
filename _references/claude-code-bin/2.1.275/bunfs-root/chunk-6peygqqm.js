// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{p}from"/$bunfs/root/chunk-dtjhjxgx.js";import{go}from"/$bunfs/root/chunk-aanhj0tj.js";import{q,gd}from"/$bunfs/root/chunk-nfxfp8ap.js";var zV=go({kind:"mcp_elicitation",payload:p(()=>gd((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>gd((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),E5=go({kind:"mcp_elicitation_waiting",payload:p(()=>gd((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>q(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function j$n(t){return t===zV.kind||t===E5.kind}
export{zV,E5,j$n};
