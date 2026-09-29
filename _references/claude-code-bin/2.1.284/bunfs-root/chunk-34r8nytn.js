// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{ho}from"/$bunfs/root/chunk-ae0377d3.js";import{z,kp}from"/$bunfs/root/chunk-fwjxbyrt.js";var W8=ho({kind:"mcp_elicitation",payload:f(()=>kp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>kp((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),uZ=ho({kind:"mcp_elicitation_waiting",payload:f(()=>kp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>z(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function _hr(t){return t===W8.kind||t===uZ.kind}
export{W8,uZ,_hr};
