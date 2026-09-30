// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Jg}from"/$bunfs/root/chunk-zx0c9jrs.js";import{ue}from"/$bunfs/root/chunk-g5r8wnkm.js";import{f_}from"/$bunfs/root/chunk-j1dsfhfr.js";function PH(r){console.error(ue.red(r))}function Qt(r,e="cli_error"){if(r)PH(r);Jg(e),process.exit(1);return}function QS(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function yh(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function gE(r){process.stderr.write(ue.yellow(f_(r))+`
`)}async function Nie(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-6hr080y8.js");await r()}catch{}}async function Ts(r){await Nie(),process.exit(r);return}async function $i(r){return await Nie(),Qt(r)}async function cD(r){if(r)process.stdout.write(r+`
`);return await Nie(),QS()}
export{PH,Qt,QS,yh,gE,Nie,Ts,$i,cD};
