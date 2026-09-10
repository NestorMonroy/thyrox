// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Esn}from"/$bunfs/root/chunk-1hcjywy9.js";import{oAe}from"/$bunfs/root/chunk-abhfa4ma.js";function fdt(o){let{parse:i}=oAe(),s=Esn(),t=!1;try{let a=i(o,{ecmaVersion:"latest",sourceType:"module",allowAwaitOutsideFunction:!0,allowReturnOutsideFunction:!0});s.simple(a,{MemberExpression(e){if(e.computed||e.object.type!=="Identifier"||e.property.type!=="Identifier")return;let r=e.object.name,n=e.property.name;if(r==="Date"&&n==="now"||r==="Math"&&n==="random")t=!0},NewExpression(e){if(e.callee.type==="Identifier"&&e.callee.name==="Date"&&e.arguments.length===0)t=!0}})}catch{return!1}return t}
export{fdt};
