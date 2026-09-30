// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Fg}from"/$bunfs/root/chunk-kcjajdc8.js";import{ue}from"/$bunfs/root/chunk-5bxxc6dq.js";import{tw}from"/$bunfs/root/chunk-h7ac8vhw.js";function iH(r){console.error(ue.red(r))}function Yt(r,e="cli_error"){if(r)iH(r);Fg(e),process.exit(1);return}function FS(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function th(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function nE(r){process.stderr.write(ue.yellow(tw(r))+`
`)}async function Use(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-vpycrg3r.js");await r()}catch{}}async function ws(r){await Use(),process.exit(r);return}async function Oi(r){return await Use(),Yt(r)}async function MM(r){if(r)process.stdout.write(r+`
`);return await Use(),FS()}
export{iH,Yt,FS,th,nE,Use,ws,Oi,MM};
