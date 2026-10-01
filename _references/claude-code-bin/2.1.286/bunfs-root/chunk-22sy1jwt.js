// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{Eo}from"/$bunfs/root/chunk-ey6tvx8w.js";import{U,Ad}from"/$bunfs/root/chunk-cgbfr9c2.js";var A9=Eo({kind:"mcp_elicitation",payload:p(()=>Ad((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>Ad((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),VZ=Eo({kind:"mcp_elicitation_waiting",payload:p(()=>Ad((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>U(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function ySr(t){return t===A9.kind||t===VZ.kind}
export{A9,VZ,ySr};
