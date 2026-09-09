// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{m}from"/$bunfs/root/chunk-7tpgnqqk.js";import{Xr}from"/$bunfs/root/chunk-ne048ww4.js";import{Y,Tp}from"/$bunfs/root/chunk-44xw78rx.js";var e2=Xr({kind:"mcp_elicitation",payload:m(()=>Tp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:m(()=>Tp((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),wq=Xr({kind:"mcp_elicitation_waiting",payload:m(()=>Tp((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:m(()=>Y(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function zin(t){return t===e2.kind||t===wq.kind}
export{e2,wq,zin};
