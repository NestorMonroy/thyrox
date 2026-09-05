// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{ep}from"/$bunfs/root/chunk-xmrr4sh8.js";import{ae}from"/$bunfs/root/chunk-8mbwgjdd.js";import{Mx}from"/$bunfs/root/chunk-mzmfq60a.js";function gM(r){console.error(ae.red(r))}function Hn(r,e="cli_error"){if(r)gM(r);ep(e),process.exit(1);return}function dw(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function aH(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function Jb(r){process.stderr.write(ae.yellow(Mx(r))+`
`)}async function gbe(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-28xad0z8.js");await r()}catch{}}async function Di(r){await gbe(),process.exit(r);return}async function Ss(r){return await gbe(),Hn(r)}async function TD(r){if(r)process.stdout.write(r+`
`);return await gbe(),dw()}
export{gM,Hn,dw,aH,Jb,gbe,Di,Ss,TD};
