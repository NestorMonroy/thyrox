// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{ORe}from"/$bunfs/root/chunk-379zyrv7.js";import{d$}from"/$bunfs/root/chunk-wa64fjnt.js";import{vo}from"/$bunfs/root/chunk-ghttqp33.js";var msr={};vo(msr,{builtinToolSchemasOf:()=>WKt,default:()=>msr});function fsr(e){try{return ORe(e,{unrepresentable:"any"})}catch(o){t(`plugin-types: an output schema did not convert: ${o}`);return}}var WKt=(e)=>e.filter((o)=>o.isMcp!==!0).map((o)=>({name:o.name,inputSchema:o.inputJSONSchema??d$(o.inputSchema),...o.outputSchema!==void 0&&{outputSchema:fsr(o.outputSchema)}}));export{fsr,WKt,msr};
