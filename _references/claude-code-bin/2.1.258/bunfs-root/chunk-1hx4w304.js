// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Yf}from"/$bunfs/root/chunk-pz607n7v.js";import{ae}from"/$bunfs/root/chunk-8gx3t4ng.js";import{EI}from"/$bunfs/root/chunk-64kpb0yv.js";function tM(r){console.error(ae.red(r))}function Hn(r,e="cli_error"){if(r)tM(r);Yf(e),process.exit(1);return}function tw(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function nw(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function Gb(r){process.stderr.write(ae.yellow(EI(r))+`
`)}async function i_e(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-34gg7mrs.js");await r()}catch{}}async function Vi(r){await i_e(),process.exit(r);return}async function _s(r){return await i_e(),Hn(r)}async function uD(r){if(r)process.stdout.write(r+`
`);return await i_e(),tw()}
export{tM,Hn,tw,nw,Gb,i_e,Vi,_s,uD};
