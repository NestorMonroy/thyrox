// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{t}from"/$bunfs/root/chunk-6w550002.js";import{_Ie}from"/$bunfs/root/chunk-v67w5hxq.js";import{h0}from"/$bunfs/root/chunk-zf2qkmse.js";import{Qr}from"/$bunfs/root/chunk-qr34qg3p.js";var spr={};Qr(spr,{builtinToolSchemasOf:()=>wYt,default:()=>spr});function opr(e){try{return _Ie(e,{unrepresentable:"any"})}catch(o){t(`plugin-types: an output schema did not convert: ${o}`);return}}var wYt=(e)=>e.filter((o)=>o.isMcp!==!0).map((o)=>({name:o.name,inputSchema:o.inputJSONSchema??h0(o.inputSchema),...o.outputSchema!==void 0&&{outputSchema:opr(o.outputSchema)}}));export{opr,wYt,spr};
