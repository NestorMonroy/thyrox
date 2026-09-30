// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ch}from"/$bunfs/root/chunk-7jxsf4cd.js";import{fe}from"/$bunfs/root/chunk-h9xec3e4.js";import{ty}from"/$bunfs/root/chunk-r11pcgdk.js";function Ox(r){console.error(fe.red(r))}function tn(r,e="cli_error"){if(r)Ox(r);Ch(e),process.exit(1);return}function Ww(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function Vg(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function XE(r){process.stderr.write(fe.yellow(ty(r))+`
`)}async function kce(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-4fhgke47.js");await r()}catch{}}async function Ds(r){await kce(),process.exit(r);return}async function Ui(r){return await kce(),tn(r)}async function RL(r){if(r)process.stdout.write(r+`
`);return await kce(),Ww()}
export{Ox,tn,Ww,Vg,XE,kce,Ds,Ui,RL};
