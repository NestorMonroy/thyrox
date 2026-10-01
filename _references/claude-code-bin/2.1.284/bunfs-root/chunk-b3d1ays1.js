// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{jxe}from"/$bunfs/root/chunk-e1ahn80a.js";import{F$}from"/$bunfs/root/chunk-8emzmjwy.js";import{ro}from"/$bunfs/root/chunk-2dxhgqgt.js";var ncr={};ro(ncr,{builtinToolSchemasOf:()=>_3t,default:()=>ncr});function tcr(e){try{return jxe(e,{unrepresentable:"any"})}catch(o){t(`plugin-types: an output schema did not convert: ${o}`);return}}var _3t=(e)=>e.filter((o)=>o.isMcp!==!0).map((o)=>({name:o.name,inputSchema:o.inputJSONSchema??F$(o.inputSchema),...o.outputSchema!==void 0&&{outputSchema:tcr(o.outputSchema)}}));export{tcr,_3t,ncr};
