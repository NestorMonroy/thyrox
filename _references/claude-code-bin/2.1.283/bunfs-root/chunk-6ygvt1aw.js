// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{uo}from"/$bunfs/root/chunk-0j3bw4bn.js";import{G,cp}from"/$bunfs/root/chunk-dk5kbfrn.js";var i8=uo({kind:"mcp_elicitation",payload:f(()=>cp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>cp((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),AQ=uo({kind:"mcp_elicitation_waiting",payload:f(()=>cp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>G(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function Kpr(t){return t===i8.kind||t===AQ.kind}
export{i8,AQ,Kpr};
