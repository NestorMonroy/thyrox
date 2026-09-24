// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{ao}from"/$bunfs/root/chunk-tqk9trcs.js";import{z,$u}from"/$bunfs/root/chunk-r9b963ay.js";var T3=ao({kind:"mcp_elicitation",payload:f(()=>$u((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>$u((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),$X=ao({kind:"mcp_elicitation_waiting",payload:f(()=>$u((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>z(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function H7n(t){return t===T3.kind||t===$X.kind}
export{T3,$X,H7n};
