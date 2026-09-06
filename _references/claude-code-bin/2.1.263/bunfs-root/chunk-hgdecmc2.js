// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{m}from"/$bunfs/root/chunk-78nzsrc6.js";import{Yr}from"/$bunfs/root/chunk-6dks1zwz.js";import{K,df}from"/$bunfs/root/chunk-9evvptjs.js";var JU=Yr({kind:"mcp_elicitation",payload:m(()=>df((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:m(()=>df((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),oW=Yr({kind:"mcp_elicitation_waiting",payload:m(()=>df((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:m(()=>K(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function frn(t){return t===JU.kind||t===oW.kind}
export{JU,oW,frn};
