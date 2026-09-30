// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{Ao}from"/$bunfs/root/chunk-r0h4t182.js";import{W,gu}from"/$bunfs/root/chunk-ea52y7e7.js";var Z8=Ao({kind:"mcp_elicitation",payload:p(()=>gu((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>gu((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),dZ=Ao({kind:"mcp_elicitation_waiting",payload:p(()=>gu((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>W(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function Jhr(t){return t===Z8.kind||t===dZ.kind}
export{Z8,dZ,Jhr};
