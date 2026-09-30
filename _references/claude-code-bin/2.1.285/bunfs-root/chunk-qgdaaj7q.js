// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{vxe}from"/$bunfs/root/chunk-srhvbygf.js";import{qM}from"/$bunfs/root/chunk-cz4d2a16.js";import{to}from"/$bunfs/root/chunk-675ch139.js";var ecr={};to(ecr,{builtinToolSchemasOf:()=>s3t,default:()=>ecr});function Zlr(e){try{return vxe(e,{unrepresentable:"any"})}catch(o){t(`plugin-types: an output schema did not convert: ${o}`);return}}var s3t=(e)=>e.filter((o)=>o.isMcp!==!0).map((o)=>({name:o.name,inputSchema:o.inputJSONSchema??qM(o.inputSchema),...o.outputSchema!==void 0&&{outputSchema:Zlr(o.outputSchema)}}));export{Zlr,s3t,ecr};
