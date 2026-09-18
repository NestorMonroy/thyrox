// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{f}from"/$bunfs/root/chunk-w8gsn0hm.js";import{fo}from"/$bunfs/root/chunk-4dc45xa2.js";import{q,Bp}from"/$bunfs/root/chunk-13s0tpz6.js";var fV=fo({kind:"mcp_elicitation",payload:f(()=>Bp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>Bp((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),M6=fo({kind:"mcp_elicitation_waiting",payload:f(()=>Bp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>q(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function UMn(t){return t===fV.kind||t===M6.kind}
export{fV,M6,UMn};
