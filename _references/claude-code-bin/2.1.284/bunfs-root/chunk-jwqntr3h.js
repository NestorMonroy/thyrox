// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Hlr}from"/$bunfs/root/chunk-q843brpg.js";import{AYe}from"/$bunfs/root/chunk-wk00b3tm.js";function l3t(i){let{parse:s}=AYe(),r=Hlr(),t=!1;try{let a=s(i,{ecmaVersion:"latest",sourceType:"module",allowAwaitOutsideFunction:!0,allowReturnOutsideFunction:!0});r.simple(a,{MemberExpression(e){if(e.computed||e.object.type!=="Identifier"||e.property.type!=="Identifier")return;let n=e.object.name,o=e.property.name;if(n==="Date"&&o==="now"||n==="Math"&&o==="random")t=!0},NewExpression(e){if(e.callee.type==="Identifier"&&e.callee.name==="Date"&&e.arguments.length===0)t=!0}})}catch{return!1}return t}
export{l3t};
