// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Th}from"/$bunfs/root/chunk-jsyn1gcs.js";import{fe}from"/$bunfs/root/chunk-wr9nx1kq.js";import{Vg}from"/$bunfs/root/chunk-a60jxnr4.js";function Qk(r){console.error(fe.red(r))}function qt(r,e="cli_error"){if(r)Qk(r);Th(e),process.exit(1);return}function QS(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function rf(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function QE(r){process.stderr.write(fe.yellow(Vg(r))+`
`)}async function Ace(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-avkdqzj8.js");await r()}catch{}}async function Jo(r){await Ace(),process.exit(r);return}async function si(r){return await Ace(),qt(r)}async function LL(r){if(r)process.stdout.write(r+`
`);return await Ace(),QS()}
export{Qk,qt,QS,rf,QE,Ace,Jo,si,LL};
