// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{f}from"/$bunfs/root/chunk-f344jh32.js";import{to}from"/$bunfs/root/chunk-fyg52qxr.js";import{z,Ju}from"/$bunfs/root/chunk-hq4c63ht.js";var I6=to({kind:"mcp_elicitation",payload:f(()=>Ju((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>Ju((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),QJ=to({kind:"mcp_elicitation_waiting",payload:f(()=>Ju((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:f(()=>z(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function $ir(t){return t===I6.kind||t===QJ.kind}
export{I6,QJ,$ir};
