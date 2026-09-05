// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{m}from"/$bunfs/root/chunk-55w4bsdv.js";import{io}from"/$bunfs/root/chunk-rv7vce82.js";import{ee,Ef}from"/$bunfs/root/chunk-84vc68b7.js";var Ij=io({kind:"mcp_elicitation",payload:m(()=>Ef((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:m(()=>Ef((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),bz=io({kind:"mcp_elicitation_waiting",payload:m(()=>Ef((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:m(()=>ee(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function kon(t){return t===Ij.kind||t===bz.kind}
export{Ij,bz,kon};
