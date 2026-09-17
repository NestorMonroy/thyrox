// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Em}from"/$bunfs/root/chunk-yy7a4xwv.js";import{ue}from"/$bunfs/root/chunk-zbq9bkhj.js";import{bx}from"/$bunfs/root/chunk-r7wmdd3t.js";function SD(r){console.error(ue.red(r))}function bn(r,e="cli_error"){if(r)SD(r);Em(e),process.exit(1);return}function Pv(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function Ey(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function wS(r){process.stderr.write(ue.yellow(bx(r))+`
`)}async function _6(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-xrykxf3k.js");await r()}catch{}}async function ps(r){await _6(),process.exit(r);return}async function Ci(r){return await _6(),bn(r)}async function Z0(r){if(r)process.stdout.write(r+`
`);return await _6(),Pv()}
export{SD,bn,Pv,Ey,wS,_6,ps,Ci,Z0};
